import subprocess
import requests
import logging
import threading
import socket
import select
import struct
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

# ──────────────────────────────────────────────────────────────────────────────
# [Bug 9] 전역 pipe 헬퍼 — LTE/Wi-Fi 양 핸들러가 공유
# ──────────────────────────────────────────────────────────────────────────────
def pipe_sockets(client: socket.socket, remote: socket.socket):
    """두 소켓 사이 양방향 데이터 중계."""
    try:
        while True:
            r, _, _ = select.select([client, remote], [], [], 60)
            if client in r:
                data = client.recv(4096)
                if not data:
                    break
                remote.sendall(data)
            if remote in r:
                data = remote.recv(4096)
                if not data:
                    break
                client.sendall(data)
    except Exception:
        pass
    finally:
        try: client.close()
        except Exception: pass
        try: remote.close()
        except Exception: pass

# ──────────────────────────────────────────────────────────────────────────────
# [Bug 7] 인터페이스 바인딩 DNS 리졸버 — DNS Leak 방지
# ──────────────────────────────────────────────────────────────────────────────
def resolve_dns_via_interface(domain: str, bind_ip: str) -> str:
    """지정한 인터페이스 IP에 UDP 소켓을 바인딩하여 DNS 쿼리 수행 (DNS Leak 완벽 방지)."""
    dns_servers = ["1.1.1.1", "8.8.8.8", "208.67.222.222"]
    for dns_server in dns_servers:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(2.5)
            sock.bind((bind_ip, 0))

            tx_id = 0xAB42
            flags = 0x0100
            qdcount = 1
            header = struct.pack('>HHHHHH', tx_id, flags, qdcount, 0, 0, 0)
            qname = b''
            for part in domain.split('.'):
                qname += bytes([len(part)]) + part.encode()
            qname += b'\x00'
            question = qname + struct.pack('>HH', 1, 1)
            packet = header + question

            sock.sendto(packet, (dns_server, 53))
            response, _ = sock.recvfrom(512)
            sock.close()

            offset = 12
            while offset < len(response) and response[offset] != 0:
                if response[offset] & 0xC0 == 0xC0:
                    offset += 2
                    break
                offset += response[offset] + 1
            else:
                offset += 1
            offset += 4

            while offset + 12 <= len(response):
                if response[offset] & 0xC0 == 0xC0:
                    offset += 2
                else:
                    while offset < len(response) and response[offset] != 0:
                        offset += response[offset] + 1
                    offset += 1
                rtype, rclass, ttl = struct.unpack('>HHI', response[offset:offset+8])
                rdlength = struct.unpack('>H', response[offset+8:offset+10])[0]
                offset += 10
                if rtype == 1 and rdlength == 4:
                    ip = socket.inet_ntoa(response[offset:offset+4])
                    logger.debug(f"[DNS] Resolved {domain} to {ip} via {dns_server} bound to {bind_ip}")
                    return ip
                offset += rdlength
        except Exception as e:
            logger.debug(f"[DNS] Interface-bound DNS query to {dns_server} failed for {domain}: {e}")
            
    # [CRITICAL] DNS Leak Prevention:
    # 지정된 인터페이스를 통한 DNS 쿼리가 모두 실패한 경우, 시스템 기본 DNS로 fallback하지 않고 에러를 발생시켜 연결을 차단합니다.
    # 만약 fallback하게 되면 시스템 기본망(Wi-Fi)으로 DNS 패킷이 유출되어 유튜브 연좌제 방어벽이 깨지게 됩니다.
    raise socket.gaierror(f"DNS resolution failed on bound interface {bind_ip} for domain {domain}")

# ──────────────────────────────────────────────────────────────────────────────
# LTE SOCKS5 Handler
# ──────────────────────────────────────────────────────────────────────────────
class Socks5Handler(StreamRequestHandler):
    def handle(self):
        remote = None
        try:
            header = recvall(self.connection, 2)
            if not header or header[0] != 5: return
            nmethods = header[1]
            methods = recvall(self.connection, nmethods)
            if not methods: return
            self.connection.send(b"\x05\x00")

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

            lte_ip = adb_service.get_tethering_interface_ip(use_cache=True)
            if addr_type == 3 and lte_ip and "169.254" not in lte_ip:
                addr = resolve_dns_via_interface(addr, lte_ip)

            if lte_ip and "169.254" not in lte_ip and lte_ip not in ["Not Detected", "Error", ""]:
                remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                remote.bind((lte_ip, 0))
                remote.connect((addr, port))
                self.connection.send(b"\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00")
                pipe_sockets(self.connection, remote)
        except Exception:
            pass
        finally:
            try: self.connection.close()
            except: pass
            if remote: remote.close()

# ──────────────────────────────────────────────────────────────────────────────
# Wi-Fi SOCKS5 Handler
# ──────────────────────────────────────────────────────────────────────────────
class WifiSocks5Handler(StreamRequestHandler):
    def handle(self):
        remote = None
        try:
            header = recvall(self.connection, 2)
            if not header or header[0] != 5: return
            nmethods = header[1]
            methods = recvall(self.connection, nmethods)
            if not methods: return
            self.connection.send(b"\x05\x00")

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

            wifi_ip = network_monitor.current_status.get("wifi", {}).get("ip", "")
            if addr_type == 3 and wifi_ip and "169.254" not in wifi_ip:
                addr = resolve_dns_via_interface(addr, wifi_ip)

            remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            if wifi_ip and "169.254" not in wifi_ip:
                remote.bind((wifi_ip, 0))
            remote.connect((addr, port))
            self.connection.send(b"\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00")
            pipe_sockets(self.connection, remote)
        except Exception:
            pass
        finally:
            try: self.connection.close()
            except: pass
            if remote: remote.close()

class NetworkService:
    def __init__(self):
        self.proxy_server = None
        self.wifi_proxy_server = None

    def initialize(self):
        self.start_proxy_server()
        network_monitor.start()

    def start_proxy_server(self):
        if not self.proxy_server:
            for attempt in range(3):
                try:
                    self.proxy_server = ThreadingTCPServer(('127.0.0.1', 10800), Socks5Handler)
                    threading.Thread(target=self.proxy_server.serve_forever, daemon=True).start()
                    break
                except OSError:
                    import time; time.sleep(1)
            if not self.proxy_server:
                print("[NET] CRITICAL: Failed to bind LTE proxy port 10800 after 3 retries.")
        if not self.wifi_proxy_server:
            for attempt in range(3):
                try:
                    self.wifi_proxy_server = ThreadingTCPServer(('127.0.0.1', 10801), WifiSocks5Handler)
                    threading.Thread(target=self.wifi_proxy_server.serve_forever, daemon=True).start()
                    break
                except OSError:
                    import time; time.sleep(1)
            if not self.wifi_proxy_server:
                print("[NET] CRITICAL: Failed to bind Wi-Fi proxy port 10801 after 3 retries.")

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
