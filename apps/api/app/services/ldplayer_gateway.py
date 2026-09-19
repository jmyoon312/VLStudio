import socket
import threading
import time
import logging
from typing import Optional

logger = logging.getLogger("LDPlayerGateway")

class LDPlayerGateway:
    """
    ViraLoop LDPlayer Universal SOCKS5 Gateway Bridge
    - 호스트 PC의 0.0.0.0:11080 포트를 열어 LDPlayer 내부의 NekoBox(172.16.1.2:11080)와 연결
    - 인입되는 SOCKS5 TCP 스트림을 스마트폰 Every Proxy(127.0.0.1:1080)로 투명 중계
    - 관리자 권한(UAC) 불필요, 모든 윈도우/리눅스 환경 100% 호환
    - 스마트폰 LTE 모뎀 RRC 유휴 절전(오프라인) 방지 Keep-Alive 하트비트 탑재
    """
    def __init__(self, listen_host: str = '0.0.0.0', listen_port: int = 11080, target_port: int = 1080):
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.target_port = target_port
        self.server_socket: Optional[socket.socket] = None
        self._running = False
        self._listener_thread: Optional[threading.Thread] = None
        self._keepalive_thread: Optional[threading.Thread] = None
        self._active_connections = 0
        self._lock = threading.Lock()

    def start(self):
        """브릿지 서버 및 셀룰러 Keep-Alive 백그라운드 시작"""
        if self._running:
            return
        
        self._running = True
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.listen_host, self.listen_port))
            self.server_socket.listen(50)
            self.server_socket.settimeout(1.0)
            
            logger.info(f"🚀 [LDPlayerGateway] Universal Bridge Active: {self.listen_host}:{self.listen_port} -> 127.0.0.1:{self.target_port}")
            
            self._listener_thread = threading.Thread(target=self._listen_loop, daemon=True, name="LDPlayerGateway-Listener")
            self._listener_thread.start()

            self._keepalive_thread = threading.Thread(target=self._keepalive_loop, daemon=True, name="LDPlayerGateway-KeepAlive")
            self._keepalive_thread.start()
        except Exception as e:
            logger.error(f"❌ [LDPlayerGateway] Failed to start gateway on {self.listen_port}: {e}")
            self._running = False
            if self.server_socket:
                try: self.server_socket.close()
                except: pass

    def stop(self):
        """브릿지 서버 종료"""
        self._running = False
        if self.server_socket:
            try:
                self.server_socket.close()
            except:
                pass
        logger.info("[LDPlayerGateway] Gateway stopped.")

    def get_status(self) -> dict:
        return {
            "active": self._running,
            "universal_host": "172.16.1.2",
            "listen_port": self.listen_port,
            "target_port": self.target_port,
            "active_connections": self._active_connections
        }

    def _listen_loop(self):
        while self._running:
            try:
                client_sock, client_addr = self.server_socket.accept()
                threading.Thread(target=self._handle_connection, args=(client_sock, client_addr), daemon=True).start()
            except socket.timeout:
                continue
            except Exception as e:
                if self._running:
                    logger.debug(f"[LDPlayerGateway] Accept error: {e}")
                break

    def _handle_connection(self, client_sock: socket.socket, client_addr: tuple):
        with self._lock:
            self._active_connections += 1

        remote_sock = None
        try:
            client_sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            remote_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            remote_sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            remote_sock.settimeout(5.0)

            # 1차 시도: ADB 포워딩 (127.0.0.1:1080)
            try:
                remote_sock.connect(('127.0.0.1', self.target_port))
            except Exception:
                # 2차 시도: 폴백으로 테더링 게이트웨이 IP 확인
                from app.services.adb_service import adb_service
                gw_ip = adb_service.get_tethering_gateway_ip()
                if gw_ip and gw_ip not in ("127.0.0.1", ""):
                    remote_sock.connect((gw_ip, self.target_port))
                else:
                    raise

            remote_sock.settimeout(None)
            client_sock.settimeout(None)

            t1 = threading.Thread(target=self._pipe, args=(client_sock, remote_sock), daemon=True)
            t2 = threading.Thread(target=self._pipe, args=(remote_sock, client_sock), daemon=True)
            t1.start()
            t2.start()
            t1.join()
            t2.join()

        except Exception as e:
            logger.debug(f"[LDPlayerGateway] Connection from {client_addr} closed: {e}")
        finally:
            with self._lock:
                self._active_connections = max(0, self._active_connections - 1)
            if client_sock:
                try: client_sock.close()
                except: pass
            if remote_sock:
                try: remote_sock.close()
                except: pass

    def _pipe(self, src: socket.socket, dst: socket.socket):
        buf = bytearray(8192)
        try:
            while self._running:
                nbytes = src.recv_into(buf)
                if nbytes <= 0:
                    break
                dst.sendall(memoryview(buf)[:nbytes])
        except:
            pass
        finally:
            try: src.shutdown(socket.SHUT_RD)
            except: pass
            try: dst.shutdown(socket.SHUT_WR)
            except: pass

    def _keepalive_loop(self):
        """스마트폰 화면이 꺼져 있어도 통신사 LTE 모뎀이 RRC 유휴(슬립/오프라인) 상태로 빠지지 않도록 가벼운 하트비트 송출"""
        while self._running:
            time.sleep(45)
            if not self._running:
                break
            try:
                # Every Proxy를 통해 1회성 가벼운 HEAD 요청 (50바이트 미만)
                import requests
                proxies = {
                    "http": f"socks5h://127.0.0.1:{self.target_port}",
                    "https": f"socks5h://127.0.0.1:{self.target_port}"
                }
                requests.head("https://api.ipify.org", proxies=proxies, timeout=2.5)
            except Exception:
                # 실패하더라도 조용히 넘어감 (로테이션 중일 수 있음)
                pass

ldplayer_gateway = LDPlayerGateway()
