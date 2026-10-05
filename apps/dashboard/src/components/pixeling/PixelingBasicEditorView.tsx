import React, { useState } from 'react';
import { 
    Palette, 
    Layers, 
    Type, 
    Sliders, 
    Save, 
    Download, 
    ExternalLink, 
    Square, 
    Maximize2, 
    Eye,
    Plus,
    Undo,
    Redo,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface PixelingBasicEditorViewProps {
    onOpenFullStudio?: () => void;
}

export function PixelingBasicEditorView({ onOpenFullStudio }: PixelingBasicEditorViewProps) {
    const [selectedFormFactor, setSelectedFormFactor] = useState<'classic' | 'insta' | 'gunlimbo' | 'ssul'>('classic');
    const [titleText, setTitleText] = useState<string>('시청자가 멈추는 0초 바이럴 훅');
    const [subtitleText, setSubtitleText] = useState<string>('여기에 자막 텍스트가 표시됩니다');
    const [fontFamily, setFontFamily] = useState<string>('Pretendard Bold');
    const [fontSize, setFontSize] = useState<number>(36);
    const [outlineColor, setOutlineColor] = useState<string>('#000000');
    const [outlineWidth, setOutlineWidth] = useState<number>(3);
    const [textColor, setTextColor] = useState<string>('#FFFFFF');
    const [bandBgColor, setBandBgColor] = useState<string>('#FFE600');

    const handleSaveShellPreset = () => {
        toast.success(`[${selectedFormFactor.toUpperCase()}] 껍데기 프리셋이 성공적으로 저장되었습니다.`);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* Top Toolbar */}
            <div className="h-12 px-6 border-b border-border/60 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xs">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <Palette className="w-4 h-4 text-blue-600" />
                        <span>기본 에디터 — 껍데기 디자인 공방</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        엔진 가동 중
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSaveShellPreset}
                        className="px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Save className="w-3.5 h-3.5 text-blue-600" />
                        <span>프리셋으로 저장</span>
                    </button>
                    {onOpenFullStudio && (
                        <button
                            type="button"
                            onClick={onOpenFullStudio}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>전체 기본 에디터 열기</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 3-Column Studio Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Left Layers / Form Factor Selector */}
                <div className="w-64 border-r border-border/60 bg-card/40 p-4 space-y-5 overflow-y-auto shrink-0">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>4대 폼팩터 규격 선택</span>
                        </label>
                        <div className="space-y-1.5">
                            {[
                                { id: 'classic', label: '1. 클래식 쇼츠 (표준 9:16)' },
                                { id: 'insta', label: '2. 인스타 감성 릴스 (프로필/댓글)' },
                                { id: 'gunlimbo', label: '3. 군림보 텐션 쇼츠 (훅 밴드)' },
                                { id: 'ssul', label: '4. 디시/에펨 썰형 (헤더/누적)' },
                            ].map(ff => (
                                <button
                                    key={ff.id}
                                    type="button"
                                    onClick={() => setSelectedFormFactor(ff.id as any)}
                                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                                        selectedFormFactor === ff.id
                                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                                            : 'border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {ff.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Layer Structure */}
                    <div className="space-y-2 pt-3 border-t border-border/50">
                        <label className="text-xs font-bold text-foreground">
                            껍데기 레이어 구조
                        </label>
                        <div className="space-y-1 text-xs">
                            <div className="p-2 rounded-lg bg-background border border-border/60 flex items-center justify-between">
                                <span className="font-medium text-foreground">상단 훅 / 타이틀 밴드</span>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="p-2 rounded-lg bg-background border border-border/60 flex items-center justify-between">
                                <span className="font-medium text-foreground">중앙 나레이션 자막 슬롯</span>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="p-2 rounded-lg bg-background border border-border/60 flex items-center justify-between">
                                <span className="font-medium text-foreground">채널 워터마크 & 배지</span>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="p-2 rounded-lg bg-muted/60 border border-dashed border-border/60 flex items-center justify-between text-muted-foreground">
                                <span>배경 비디오 슬롯 (9:16)</span>
                                <span className="text-[10px]">비어있음</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Center Canvas Live View (9:16 Mobile Simulator) */}
                <div className="flex-1 bg-muted/20 flex items-center justify-center p-6 overflow-hidden">
                    <div className="w-[320px] h-[568px] rounded-3xl bg-black border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4">
                        {/* Status bar mock */}
                        <div className="w-full flex items-center justify-between text-[10px] text-white/60 font-mono">
                            <span>09:41</span>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>5G</span>
                            </div>
                        </div>

                        {/* Top Hook Slot (Form factor based) */}
                        {selectedFormFactor === 'gunlimbo' && (
                            <div 
                                className="w-full py-2 px-3 text-center font-black rounded-lg shadow-md"
                                style={{ backgroundColor: bandBgColor, color: '#000000', fontSize: '15px' }}
                            >
                                {titleText}
                            </div>
                        )}

                        {selectedFormFactor === 'ssul' && (
                            <div className="w-full p-2 rounded-lg bg-card/90 text-foreground border border-border text-[11px] space-y-1 shadow-md">
                                <div className="font-bold flex items-center justify-between">
                                    <span>익명 게시판</span>
                                    <span className="text-muted-foreground text-[9px]">10분 전</span>
                                </div>
                                <div className="font-semibold text-xs text-foreground">{titleText}</div>
                            </div>
                        )}

                        {selectedFormFactor === 'insta' && (
                            <div className="w-full flex items-center gap-2 text-white text-xs">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-0.5">
                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-[9px]">V</div>
                                </div>
                                <span className="font-bold">viraloop.official</span>
                            </div>
                        )}

                        {/* Center/Lower Subtitle Slot */}
                        <div className="my-auto text-center px-2">
                            <span 
                                style={{
                                    fontSize: `${fontSize * 0.45}px`,
                                    color: textColor,
                                    fontFamily: fontFamily,
                                    textShadow: `${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}, -${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, ${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, -${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}`
                                }}
                                className="font-extrabold tracking-tight leading-relaxed block break-keep"
                            >
                                {subtitleText}
                            </span>
                        </div>

                        {/* Bottom Safe Zone Indicator */}
                        <div className="w-full py-1 text-center">
                            <span className="text-[9px] text-white/40 tracking-wider">
                                9:16 SHORTS SAFE ZONE
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Right Property Inspector */}
                <div className="w-72 border-l border-border/60 bg-card/40 p-4 space-y-5 overflow-y-auto shrink-0">
                    <div className="text-xs font-bold text-foreground">
                        껍데기 속성 인스펙터
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                            <label className="text-muted-foreground">훅/타이틀 텍스트</label>
                            <input
                                type="text"
                                value={titleText}
                                onChange={e => setTitleText(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-card text-foreground text-xs focus:ring-1 focus:ring-blue-600 outline-hidden"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-muted-foreground">자막 텍스트</label>
                            <textarea
                                value={subtitleText}
                                onChange={e => setSubtitleText(e.target.value)}
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-card text-foreground text-xs focus:ring-1 focus:ring-blue-600 outline-hidden resize-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-muted-foreground">서체(Font Family)</label>
                            <select
                                value={fontFamily}
                                onChange={e => setFontFamily(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-card text-foreground text-xs focus:ring-1 focus:ring-blue-600 outline-hidden"
                            >
                                <option value="Pretendard Bold">Pretendard Bold (가독성)</option>
                                <option value="GmarketSans Bold">GmarketSans Bold (텐션)</option>
                                <option value="NanumSquareRound Bold">NanumSquareRound (썰형)</option>
                                <option value="Noto Serif KR">Noto Serif KR (감성)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-muted-foreground">자막 크기</label>
                                <span className="font-mono text-muted-foreground">{fontSize}px</span>
                            </div>
                            <input
                                type="range"
                                min={24}
                                max={64}
                                value={fontSize}
                                onChange={e => setFontSize(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="space-y-1">
                                <label className="text-muted-foreground">글자 색상</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="color"
                                        value={textColor}
                                        onChange={e => setTextColor(e.target.value)}
                                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                                    />
                                    <span className="font-mono text-[11px] text-muted-foreground">{textColor}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-muted-foreground">외곽선 색상</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="color"
                                        value={outlineColor}
                                        onChange={e => setOutlineColor(e.target.value)}
                                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                                    />
                                    <span className="font-mono text-[11px] text-muted-foreground">{outlineColor}</span>
                                </div>
                            </div>
                        </div>

                        {selectedFormFactor === 'gunlimbo' && (
                            <div className="space-y-1 pt-2">
                                <label className="text-muted-foreground">군림보 훅 밴드 배경색</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="color"
                                        value={bandBgColor}
                                        onChange={e => setBandBgColor(e.target.value)}
                                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                                    />
                                    <span className="font-mono text-[11px] text-muted-foreground">{bandBgColor}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
