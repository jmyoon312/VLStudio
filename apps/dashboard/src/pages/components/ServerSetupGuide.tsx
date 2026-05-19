import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Assuming we have these or will fallback to generic
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Terminal, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServerSetupGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ServerSetupGuide: React.FC<ServerSetupGuideProps> = ({ isOpen, onClose }) => {
    // Simple mock for copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Optionally toast?
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white">
                <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Terminal className="w-6 h-6 text-blue-600" />
                        외부 송출 서버 (RTMP Relay) 구축 가이드
                    </DialogTitle>
                    <DialogDescription>
                        안정적인 24시간 방송을 위해 외부 클라우드(AWS, Vultr 등)에 RTMP 서버를 구축하는 방법입니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="p-6 space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">🚀 왜 외부 서버가 필요한가요?</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                로컬 PC에서 직접 유튜브로 송출할 경우, PC를 끄거나 인터넷이 불안정하면 방송이 끊깁니다.
                                <br />
                                <strong>중계(Relay) 서버</strong>를 사용하면, 로컬 PC에서 영상을 잠깐 멈추거나 재시작해도
                                서버가 유튜브와의 연결을 유지해주며(Hold), 끊김 없는 24시간 방송이 가능해집니다.
                            </p>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">🛠️ 1. 가장 쉬운 방법: Docker 사용 (추천)</h3>
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-2">
                                AWS EC2, DigitalOcean, Vultr 등의 리눅스(Ubuntu) 서버를 추천합니다.
                            </div>

                            <div className="space-y-2">
                                <p className="font-semibold text-gray-700">1. Docker 설치</p>
                                <div className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-xs relative group">
                                    <pre>
                                        curl -fsSL https://get.docker.com -o get-docker.sh{'\n'}
                                        sudo sh get-docker.sh
                                    </pre>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyToClipboard('curl -fsSL https://get.docker.com -o get-docker.sh\nsudo sh get-docker.sh')}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="font-semibold text-gray-700">2. NGINX-RTMP 서버 실행 (한 줄 명령어)</p>
                                <div className="bg-gray-900 text-gray-200 p-3 rounded-lg font-mono text-xs relative group">
                                    <pre>
                                        docker run -d -p 1935:1935 -p 8080:80 --name rtmp-server tiangolo/nginx-rtmp
                                    </pre>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyToClipboard('docker run -d -p 1935:1935 -p 8080:80 --name rtmp-server tiangolo/nginx-rtmp')}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    이제 서버의 IP 주소를 통해 RTMP 송출을 받을 준비가 되었습니다.
                                </p>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">📝 2. NGINX 설정 (심화: 유튜브 재송출)</h3>
                            <p className="text-sm text-gray-600">
                                단순히 받아들이는 것을 넘어, 서버가 받아서 **유튜브로 자동 재송출(Push)** 하도록 설정하려면
                                `nginx.conf` 파일을 수정해야 합니다.
                            </p>

                            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-sm mb-2">nginx.conf 예시</h4>
                                <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs text-gray-800 overflow-x-auto">
                                    <pre>{`rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application live {
            live on;
            record off;

            # 유튜브로 재송출 (Push)
            # {STREAM_KEY} 부분에 실제 유튜브 스트림 키를 입력하세요.
            push rtmp://a.rtmp.youtube.com/live2/{STREAM_KEY};
        }
    }
}`}</pre>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">🔗 3. ViraLoop 스테이션 연결</h3>
                            <p className="text-sm text-gray-600">
                                이제 스테이션 설정의 "외부 서버 (Relay)" 탭에 아래 정보를 입력하세요.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-3 rounded-lg bg-gray-50">
                                    <span className="text-xs font-bold text-gray-500 block mb-1">RTMP URL</span>
                                    <div className="font-mono font-bold text-blue-600 break-all">
                                        rtmp://[서버IP]:1935/live
                                    </div>
                                </div>
                                <div className="border p-3 rounded-lg bg-gray-50">
                                    <span className="text-xs font-bold text-gray-500 block mb-1">스트림 키 (Stream Key)</span>
                                    <div className="font-mono font-bold text-gray-700">
                                        (임의 지정, 예: test)
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-red-500 mt-2">
                                * 주의: 방화벽(AWS Security Group 등)에서 1935번 포트(TCP)가 열려 있어야 합니다.
                            </p>
                        </div>

                        <div className="pt-4">
                            <a
                                href="https://www.youtube.com/results?search_query=nginx+rtmp+obs+setup"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-bold text-sm"
                            >
                                <PlayCircle className="w-4 h-4" />
                                참고 영상 검색 (YouTube)
                            </a>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button onClick={onClose}>닫기</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
