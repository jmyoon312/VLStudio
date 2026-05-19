
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
                    logger.warning(f"[Proxy] Connection via LTE ({lte_ip}) Failed: {e}. Falling back to System Route.")
                    if remote: remote.close()
                    remote = None
            
            # Attempt 2: Fallback to System Route (Wi-Fi/Default)
            if not connected:
                try:
                    remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    remote.settimeout(10.0)
                    remote.connect((addr, port))
                    connected = True
                    logger.info(f"[Proxy] Connected via System Route (Fallback)")
                except Exception as e:
                    logger.error(f"[Proxy] Remote Connect Failed (System Route) to {addr}:{port} - {e}")
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
        # print("[NET] NetworkService Init")

    def initialize(self):
        self.start_proxy_server()
        network_monitor.start()

    def start_proxy_server(self):
        if self.proxy_server: return
        
        # [FIX] Retry logic for port binding (handle frequent reloads)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self.proxy_server = ThreadingTCPServer(('127.0.0.1', 10800), Socks5Handler)
                thread = threading.Thread(target=self.proxy_server.serve_forever)
                thread.daemon = True
                thread.start()
                print(f"[NET] Proxy server started (127.0.0.1:10800) - Attempt {attempt+1}")
                return
            except OSError as e:
                import time
                if "Address already in use" in str(e):
                    print(f"[NET] Port 10800 in use (Attempt {attempt+1}/{max_retries})... Waiting...")
                    time.sleep(1)
                else:
                    print(f"[NET] Proxy Start Failed: {e}")
                    return
            except Exception as e:
                print(f"[NET] Unknown Proxy Error: {e}")
                return
        
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
