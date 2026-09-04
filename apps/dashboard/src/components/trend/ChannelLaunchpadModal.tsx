import React, { useState } from 'react';
import { 
    Sparkles, Copy, Check, Rocket, ShieldCheck, Tag, 
    Palette, Image as ImageIcon, Film, FileText, CheckCircle2, 
    Loader2, ChevronRight, ExternalLink, HelpCircle
} from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Category, ChannelLaunchpadPackage, generateLaunchpadPack, createBrandFromLaunchpad } from '../../lib/api';
import { cn } from '../../lib/utils';

interface ChannelLaunchpadModalProps {
    category: Category | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBrandCreated?: (brandChannelId: number, title: string) => void;
}

export const ChannelLaunchpadModal: React.FC<ChannelLaunchpadModalProps> = ({
    category,
    open,
    onOpenChange,
    onBrandCreated
}) => {
    const [loading, setLoading] = useState(false);
    const [pack, setPack] = useState<ChannelLaunchpadPackage | null>(null);
    const [selectedNameIdx, setSelectedNameIdx] = useState<number>(0);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);
    const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

    // Load or generate package when modal opens
    React.useEffect(() => {
        if (open && category) {
            fetchLaunchpadPack();
        } else {
            setPack(null);
            setCreateSuccessMsg(null);
        }
    }, [open, category]);

    const fetchLaunchpadPack = async () => {
        if (!category) return;
        setLoading(true);
        setCreateSuccessMsg(null);
        try {
            const res = await generateLaunchpadPack(category.id);
            if (res.package) {
                setPack(res.package);
                setSelectedNameIdx(0);
            }
        } catch (e) {
            console.error('Failed to generate launchpad pack:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, fieldKey: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCreateBrand = async () => {
        if (!category || !pack) return;
        const selectedBrand = pack.brand_names[selectedNameIdx];
        if (!selectedBrand) return;

        setIsCreatingBrand(true);
        try {
            const res = await createBrandFromLaunchpad(category.id, {
                title: selectedBrand.name,
                channel_handle: selectedBrand.handle,
                description: pack.about_bio?.description,
                avatar_prompt: pack.avatar_concept?.ai_prompt,
                banner_headline: pack.banner_concept?.headline,
                style_signature: {
                    handle: selectedBrand.handle,
                    type: selectedBrand.type,
                    rationale: selectedBrand.rationale,
                    color_palette: pack.avatar_concept?.color_palette,
                    hashtags: pack.about_bio?.hashtags,
                    kickoff_plan: pack.kickoff_content_plan
                }
            });
            setCreateSuccessMsg(res.message || '브랜드 채널이 성공적으로 등록되었습니다.');
            onBrandCreated?.(res.brand_channel_id, res.title);
        } catch (e) {
            console.error('Failed to create brand channel:', e);
        } finally {
            setIsCreatingBrand(false);
        }
    };

    if (!category) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border border-border text-foreground rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                                <Sparkles className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black tracking-tight">AI 채널 론치패드 (Channel Genesis Suite)</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                        {category.name} 특화
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    수집된 벤치마킹 채널 데이터를 9router AI로 정밀 해체하여, 즉시 개설 가능한 5대 채널 론칭 패키지를 추천합니다.
                                </p>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchLaunchpadPack}
                            disabled={loading}
                            className="h-8 text-xs font-bold border-border rounded-xl cursor-pointer"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />}
                            다시 기획하기
                        </Button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin" />
                                <Sparkles className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-foreground">9router AI가 경쟁 채널 DNA를 해체하는 중...</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    상위 1% 알고리즘 훅, 썸네일 특징, SEO 키워드를 결합하여 채널 브랜딩 패키지를 생성하고 있습니다.
                                </p>
                            </div>
                        </div>
                    ) : pack ? (
                        <>
                            {/* 1. 브랜드 네이밍 선택 */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-blue-500" />
                                        1. 알고리즘 최적화 추천 채널명 & 핸들 (택 1)
                                    </h4>
                                    <span className="text-[11px] text-muted-foreground">클릭하여 개설할 채널명을 선택하세요</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {pack.brand_names.map((b, idx) => {
                                        const isSelected = selectedNameIdx === idx;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedNameIdx(idx)}
                                                className={cn(
                                                    "p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-2",
                                                    isSelected 
                                                        ? "bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md" 
                                                        : "bg-muted/30 border-border hover:border-border/80 hover:bg-muted/50"
                                                )}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-3 right-3 text-indigo-500">
                                                        <CheckCircle2 className="w-4 h-4 fill-current text-white" />
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                                                        {b.type}
                                                    </span>
                                                    <h5 className="text-sm font-black text-foreground mt-1.5">{b.name}</h5>
                                                    <p className="text-xs font-mono font-bold text-indigo-400">{b.handle}</p>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                    {b.rationale}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2 & 3. 프로필 아바타 & 상단 배너 아트 기획 (2열 그리드) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 프로필 아바타 */}
                                <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                                            <Palette className="w-3.5 h-3.5 text-amber-500" />
                                            2. 채널 프로필 아바타 (1:1)
                                        </h4>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleCopy(pack.avatar_concept.ai_prompt, 'avatar')}
                                            className="h-7 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                                        >
                                            {copiedField === 'avatar' ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {copiedField === 'avatar' ? '복사됨' : '프롬프트 복사'}
                                        </Button>
                                    </div>

                                    <p className="text-xs text-foreground/90 font-medium">
                                        {pack.avatar_concept.visual_concept}
                                    </p>

                                    {/* Color Palette */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground">추천 컬러:</span>
                                        <div className="flex items-center gap-1.5">
                                            {pack.avatar_concept.color_palette.map((c, i) => (
                                                <div 
                                                    key={i} 
                                                    className="w-5 h-5 rounded-full border border-white/20 shadow-xs" 
                                                    style={{ backgroundColor: c }}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-black/40 border border-border/80 font-mono text-[10.5px] text-muted-foreground leading-relaxed">
                                        {pack.avatar_concept.ai_prompt}
                                    </div>
                                </div>

                                {/* 상단 배너 아트 */}
                                <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                                            <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                                            3. 채널 상단 배너 아트 (2560x1440)
                                        </h4>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleCopy(pack.banner_concept.ai_prompt, 'banner')}
                                            className="h-7 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                                        >
                                            {copiedField === 'banner' ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {copiedField === 'banner' ? '복사됨' : '프롬프트 복사'}
                                        </Button>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-foreground">
                                            메인: "{pack.banner_concept.headline}"
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            서브: {pack.banner_concept.sub_slogan}
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-black/40 border border-border/80 font-mono text-[10.5px] text-muted-foreground leading-relaxed">
                                        {pack.banner_concept.ai_prompt}
                                    </div>
                                </div>
                            </div>

                            {/* 4. 채널 공식 소개글 (About Bio) */}
                            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                        4. 알고리즘 SEO 최적화 채널 소개글 (About Bio)
                                    </h4>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleCopy(pack.about_bio.description, 'bio')}
                                        className="h-7 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                                    >
                                        {copiedField === 'bio' ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                        {copiedField === 'bio' ? '복사됨' : '소개글 복사'}
                                    </Button>
                                </div>

                                <p className="text-xs text-foreground/90 leading-relaxed font-medium bg-card/60 p-3 rounded-xl border border-border/60">
                                    {pack.about_bio.description}
                                </p>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {pack.about_bio.hashtags.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-muted text-indigo-400 border border-indigo-500/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* 5. 런칭 초기 3편 숏폼 훅 기획안 */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Film className="w-3.5 h-3.5 text-rose-500" />
                                    5. 개설 즉시 업로드할 초기 런칭 3편 숏폼 훅 기획
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {pack.kickoff_content_plan.map((item, idx) => (
                                        <div key={idx} className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                {item.step}
                                            </span>
                                            <h5 className="text-xs font-black text-foreground line-clamp-2">
                                                {item.title}
                                            </h5>
                                            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-500 font-medium">
                                                ⚡ 3초 훅: "{item.hook_line}"
                                            </div>
                                            <p className="text-[10.5px] text-muted-foreground">
                                                🎯 기대 효과: {item.expected_impact}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            데이터를 불러올 수 없습니다. 다시 시도해 주세요.
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 sm:p-5 border-t border-border bg-card/80 flex items-center justify-between gap-4 shrink-0">
                    <div className="text-xs text-muted-foreground">
                        {createSuccessMsg ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-4 h-4" /> {createSuccessMsg}
                            </span>
                        ) : pack ? (
                            <span>
                                선택된 채널명: <strong className="text-foreground">{pack.brand_names[selectedNameIdx]?.name}</strong>
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onOpenChange(false)}
                            className="h-9 px-4 text-xs font-bold rounded-xl"
                        >
                            닫기
                        </Button>

                        <Button 
                            size="sm"
                            onClick={handleCreateBrand}
                            disabled={!pack || isCreatingBrand}
                            className="h-9 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                        >
                            {isCreatingBrand ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                                <Rocket className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                            )}
                            🚀 이 기획으로 브랜드 채널 즉시 등록
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
