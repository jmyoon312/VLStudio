import React from 'react';
import { useLofiStudioStore } from '../../store/useLofiStudioStore';
import { Music, Clock, Activity, Plus, Circle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const WidgetPanel: React.FC = () => {
    const { addLayer } = useLofiStudioStore();

    const handleAddWidget = (widgetType: 'nowPlaying' | 'clock' | 'visualizer', subType: string = 'bars') => {
        const baseLayer = {
            visible: true,
            locked: false,
            x: 640,
            y: 360,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            type: 'widget' as const,
            widgetType,
        };

        switch (widgetType) {
            case 'nowPlaying':
                addLayer({
                    ...baseLayer,
                    name: 'Now Playing',
                    width: 400,
                    height: 120,
                    widgetConfig: {
                        style: 'card', // 'card' | 'simple'
                        showCover: true,
                    },
                });
                break;
            case 'clock':
                addLayer({
                    ...baseLayer,
                    name: 'Digital Clock',
                    width: 300,
                    height: 100,
                    widgetConfig: {
                        format: '24h',
                        showSeconds: true,
                    },
                });
                break;
            case 'visualizer':
                let width = 600;
                let height = 200;
                let name = 'Spectrum Bars';
                let color = '#4ECDC4';

                if (subType === 'circle') {
                    width = 400;
                    height = 400;
                    name = 'Circle Pulse';
                    color = '#FF0099';
                } else if (subType === 'wave') {
                    width = 600;
                    height = 200;
                    name = 'Neon Wave';
                    color = '#00FFFF';
                }

                addLayer({
                    ...baseLayer,
                    name,
                    width,
                    height,
                    widgetConfig: {
                        variant: subType, // 'bars', 'circle', 'wave'
                        color,
                        bars: 20,
                    },
                });
                break;
        }
    };

    return (
        <div className="h-full flex flex-col bg-card">
            <div className="flex-shrink-0 p-3 border-b border-border bg-card">
                <h2 className="text-sm font-bold text-foreground">위젯 (Widgets)</h2>
                <p className="text-xs text-muted-foreground mt-0.5">방송 화면에 표시할 위젯을 추가하세요.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-card">
                {/* Now Playing Widget */}
                <Card className="cursor-pointer hover:border-primary transition-colors bg-card border-border shadow-2xs" onClick={() => handleAddWidget('nowPlaying')}>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Music className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm text-foreground">현재 재생 정보</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Now Playing</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-xs text-muted-foreground mb-3">현재 재생 중인 곡의 제목과 아티스트 정보를 표시합니다.</p>
                        <Button size="sm" className="w-full text-xs" variant="secondary">
                            <Plus className="w-3 h-3 mr-1" /> 추가하기
                        </Button>
                    </CardContent>
                </Card>

                {/* Clock Widget */}
                <Card className="cursor-pointer hover:border-emerald-500 transition-colors bg-card border-border shadow-2xs" onClick={() => handleAddWidget('clock')}>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm text-foreground">디지털 시계</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Digital Clock</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-xs text-muted-foreground mb-3">현재 시간을 실시간으로 표시하는 디지털 시계 위젯입니다.</p>
                        <Button size="sm" className="w-full text-xs" variant="secondary">
                            <Plus className="w-3 h-3 mr-1" /> 추가하기
                        </Button>
                    </CardContent>
                </Card>

                {/* Visualizer: Bars */}
                <Card className="cursor-pointer hover:border-purple-500 transition-colors bg-card border-border shadow-2xs" onClick={() => handleAddWidget('visualizer', 'bars')}>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm text-foreground">스펙트럼 바</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Spectrum Bars</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-xs text-muted-foreground mb-3">비트에 맞춰 움직이는 화려한 막대형 비주얼라이저입니다.</p>
                        <Button size="sm" className="w-full text-xs" variant="secondary">
                            <Plus className="w-3 h-3 mr-1" /> 추가하기
                        </Button>
                    </CardContent>
                </Card>

                {/* Visualizer: Circle Pulse */}
                <Card className="cursor-pointer hover:border-pink-500 transition-colors bg-card border-border shadow-2xs" onClick={() => handleAddWidget('visualizer', 'circle')}>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                                <Circle className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm text-foreground">서클 펄스</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Circle Pulse</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-xs text-muted-foreground mb-3">중앙에서 퍼져나가는 역동적인 펄스 효과입니다.</p>
                        <Button size="sm" className="w-full text-xs" variant="secondary">
                            <Plus className="w-3 h-3 mr-1" /> 추가하기
                        </Button>
                    </CardContent>
                </Card>

                {/* Visualizer: Neon Wave */}
                <Card className="cursor-pointer hover:border-cyan-500 transition-colors bg-card border-border shadow-2xs" onClick={() => handleAddWidget('visualizer', 'wave')}>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm text-foreground">네온 웨이브</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Neon Wave</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <p className="text-xs text-muted-foreground mb-3">네온 빛으로 흐르는 부드러운 웨이브 파형입니다.</p>
                        <Button size="sm" className="w-full text-xs" variant="secondary">
                            <Plus className="w-3 h-3 mr-1" /> 추가하기
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};
