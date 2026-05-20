
import subprocess
import requests
import logging
import threading
import socket
import select
from socketserver import ThreadingMixIn, TCPServer, StreamRequestHandler
from app.services.adb_service import adb_service
from app.services.network_monitor import network_monitor

logger = logging.getLogger("NetworkCore")

class ThreadingTCPServer(ThreadingMixIn, TCPServer):
    allow_reuse_address = True
    pass

def recvall(sock, n):
    data = b''
    while len(data) < n:
        packet = sock.recv(n - len(data))
        if not packet: return None
        data += packet
    return data

class Socks5Handler(StreamRequestHandler):
    def handle(self):
        remote = None
        try:
            # SOCKS5 Initial Handshake: [VER, NMETHODS, METHODS...]
            header = recvall(self.connection, 2)
            if not header or header[0] != 5: return
            
            nmethods = header[1]
            methods = recvall(self.connection, nmethods)  # Read authentication methods
            if not methods: return
            
            # Respond: No authentication required
            self.connection.send(b"\x05\x00")
            
            # SOCKS5 Request: [VER, CMD, RSV, ATYP, DST.ADDR, DST.PORT]
            header = recvall(self.connection, 4)
            if not header or header[1] != 1: return 
            addr_type = header[3]
            if addr_type == 1: 
                raw_ip = recvall(self.connection, 4)
                if not raw_ip: return
                addr = socket.inet_ntoa(raw_ip)
            elif addr_type == 3: 
                len_byte = recvall(self.connection, 1)
                if not len_byte: return
                domain_len = len_byte[0]
                addr_bytes = recvall(self.connection, domain_len)
                if not addr_bytes: return
                addr = addr_bytes.decode()
            else: return
            
            port_bytes = recvall(self.connection, 2)
            if not port_bytes: return
            port = int.from_bytes(port_bytes, 'big')
            
            logger.info(f"[Proxy] Request: {addr}:{port}")

            # === Connection Strategy ===
            connected = False
            lte_ip = adb_service.get_tethering_interface_ip()
            
            # Attempt 1: Bind to LTE (Secure Isolation)
            if lte_ip and "169.254" not in lte_ip and lte_ip not in ["Not Detected", "감지되지 않음", "Error"]:
                try: 
                    remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    remote.settimeout(10.0) # Standard timeout
                    remote.bind((lte_ip, 0))
                    remote.connect((addr, port))
                    connected = True
                    # logger.info(f"[Proxy] Connected via LTE ({lte_ip})")
                except Exception as e:
                    logger.error(f"[Proxy] Connection via LTE ({lte_ip}) Failed: {e}. Strict mode active: Aborting connection to prevent IP leak.")
                    if remote: remote.close()
                    remote = None
            else:
                logger.error(f"[Proxy] LTE IP not detected ({lte_ip}). Strict mode active: Aborting connection to prevent IP leak via System Route.")
            
            # Strict mode: DO NOT fallback to System Route!
            if not connected:
                # SOCKS5 Error: Host unreachable (4)
                self.connection.send(b"\x05\x04\x00\x01\x00\x00\x00\x00\x00\x00")
                return

            # Connection Successful
            bind_addr, bind_port = remote.getsockname()
            # Safe IP parsing
            try:
                addr_ip = socket.inet_aton(bind_addr)
            except:
                # Handle cases where bind_addr is not a valid IP string (e.g. IPv6)
                addr_ip = b"\x00\x00\x00\x00"
                
            self.connection.send(b"\x05\x00\x00\x01" + addr_ip + int(bind_port).to_bytes(2, 'big'))
            self.pipe(self.connection, remote)
            
        except Exception as e:
            if "WinError 10053" not in str(e): # Ignore common client disconnects
                logger.error(f"[Proxy] Handler Fatal Error: {e}")
        finally: 
            self.connection.close()
            if remote: remote.close()

class WifiSocks5Handler(StreamRequestHandler):
    def handle(self):
        remote = None
        try:
            # SOCKS5 Initial Handshake
            header = recvall(self.connection, 2)
            if not header or header[0] != 5: return
            
            nmethods = header[1]
            methods = recvall(self.connection, nmethods)
            if not methods: return
            
            self.connection.send(b"\x05\x00")
            
            # SOCKS5 Request
            header = recvall(self.connection, 4)
            if not header or header[1] != 1: return 
            addr_type = header[3]
            if addr_type == 1: 
                raw_ip = recvall(self.connection, 4)
                if not raw_ip: return
                addr = socket.inet_ntoa(raw_ip)
            elif addr_type == 3: 
                len_byte = recvall(self.connection, 1)
                if not len_byte: return
                domain_len = len_byte[0]
                addr_bytes = recvall(self.connection, domain_len)
                if not addr_bytes: return
                addr = addr_bytes.decode()
            else: return
            
            port_bytes = recvall(self.connection, 2)
            if not port_bytes: return
            port = int.from_bytes(port_bytes, 'big')
            
            # === Wi-Fi Isolation Connection Strategy ===
            # We strictly bind to the Wi-Fi interface IP to ensure Google Flow never leaks via LTE
            connected = False
            
            # Try to get Wi-Fi interface IP from network_monitor
            wifi_ip = None
            if hasattr(network_monitor, 'current_status') and 'wifi' in network_monitor.current_status:
                wifi_status = network_monitor.current_status['wifi']
                if 'ip' in wifi_status and wifi_status['ip']:
                    wifi_ip = wifi_status['ip']
                    
            if not wifi_ip:
                # Fallback: get host IP (which usually resolves to primary Wi-Fi/Wired adapter if route is correct)
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    s.connect(("8.8.8.8", 80))
                    wifi_ip = s.getsockname()[0]
                    s.close()
                except:
                    pass
                    
            if wifi_ip and "169.254" not in wifi_ip:
                try: 
                    remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    remote.settimeout(10.0)
                    remote.bind((wifi_ip, 0))
                    remote.connect((addr, port))
                    connected = True
                except Exception as e:
                    logger.warning(f"[Wifi-Proxy] Failed to connect using Wi-Fi IP ({wifi_ip}): {e}")
                    if remote: remote.close()
                    remote = None
            
            # If explicit Wi-Fi bind failed, we try a fallback ONLY IF the system default is NOT LTE
            if not connected:
                system_mode = network_monitor.current_status.get("system_gateway_mode", "WIFI")
                if system_mode == "LTE":
                    logger.error(f"[Wifi-Proxy] Blocked: System default is LTE and Wi-Fi bind failed. Preventing leak.")
                else:
                    try:
                        remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        remote.settimeout(10.0)
                        remote.connect((addr, port))
                        connected = True
                    except Exception as e:
                        logger.error(f"[Wifi-Proxy] Fallback Connect Failed: {e}")
            
            if not connected:
                self.connection.send(b"\x05\x04\x00\x01\x00\x00\x00\x00\x00\x00")
                return

            bind_addr, bind_port = remote.getsockname()
            try:
                addr_ip = socket.inet_aton(bind_addr)
            except:
                addr_ip = b"\x00\x00\x00\x00"
                
            self.connection.send(b"\x05\x00\x00\x01" + addr_ip + int(bind_port).to_bytes(2, 'big'))
            self.pipe(self.connection, remote)
            
        except Exception as e:
            if "WinError 10053" not in str(e):
                logger.error(f"[Wifi-Proxy] Handler Error: {e}")
        finally: 
            self.connection.close()
            if remote: remote.close()


    def pipe(self, client, remote):
        try:
            while True:
                r, _, _ = select.select([client, remote], [], [], 60)
                if client in r:
                    data = client.recv(4096)
                    if not data: break
                    remote.sendall(data)
                if remote in r:
                    data = remote.recv(4096)
                    if not data: break
                    client.sendall(data)
        except: pass
        finally:
            client.close()
            remote.close()

class NetworkService:
    def __init__(self):
        self.proxy_server = None
        self.wifi_proxy_server = None

    def initialize(self):
        self.start_proxy_server()
        network_monitor.start()

    def start_proxy_server(self):
        if not self.proxy_server:
            # LTE Proxy
            for attempt in range(3):
                try:
                    self.proxy_server = ThreadingTCPServer(('127.0.0.1', 10800), Socks5Handler)
                    threading.Thread(target=self.proxy_server.serve_forever, daemon=True).start()
                    print(f"[NET] LTE Proxy server started (127.0.0.1:10800)")
                    break
                except OSError as e:
                    import time; time.sleep(1)
        
        if not self.wifi_proxy_server:
            # Wi-Fi Proxy
            for attempt in range(3):
                try:
                    self.wifi_proxy_server = ThreadingTCPServer(('127.0.0.1', 10801), WifiSocks5Handler)
                    threading.Thread(target=self.wifi_proxy_server.serve_forever, daemon=True).start()
                    print(f"[NET] Wi-Fi Proxy server started (127.0.0.1:10801)")
                    break
                except OSError as e:
                    import time; time.sleep(1)
        
        print("[NET] Failed to bind port 10800 after retries. Proxy disabled.")

    def get_current_ip(self):
        return adb_service.get_current_ip()

    def recover_adb(self): pass
    def run_command(self, cmd): return ""
    def get_tethering_ip(self): return "Auto"
    def configure_metrics(self): pass
    def is_wifi_on(self): return True
    def set_internet_source(self, s): 
        # Manual Force Toggle via Monitor
        if s == 'lte':
            # Force LTE: Decrease LTE metric below Wi-Fi (Not recommended but supported)
            # Actually, user wants "Secure Browser -> LTE". System -> WiFi.
            # So "Source Switch" in UI usually means "Make this the System Gateway".
            # If user asks for LTE, we revert rules: LTE < Wi-Fi.
            network_monitor.WIFI_METRIC_TARGET = 9000
            network_monitor.LTE_METRIC_TARGET = 10
        else:
            network_monitor.WIFI_METRIC_TARGET = 10
            network_monitor.LTE_METRIC_TARGET = 9000
        
        # Trigger immediate check
        network_monitor._check_and_enforce()
        return True

    def rotate_ip(self, m='soft'): 
        return adb_service.rotate_ip(m)

    def get_detailed_status(self):
        return network_monitor.get_status()

network_service = NetworkService()
