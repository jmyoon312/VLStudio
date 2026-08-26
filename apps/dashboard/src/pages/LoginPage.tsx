import React, { useState } from 'react';
// @ts-ignore
import { useAuth } from '@/contexts/AuthContext';
import { Zap, ShieldCheck, User, Lock, Delete, ArrowRight, Sparkles, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LoginPage() {
    const { profiles, loginWithProfile, loading } = useAuth();
    const [selectedProfileId, setSelectedProfileId] = useState<string>(() => profiles[0]?.id || 'master');
    const [pin, setPin] = useState<string>('');
    const [rememberMe, setRememberMe] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const selectedProfile = profiles.find((p: any) => p.id === selectedProfileId) || profiles[0];

    const handleSelectProfile = (p: any) => {
        setSelectedProfileId(p.id);
        setPin('');
        setErrorMsg('');
        // PIN이 필요 없는 프로필은 클릭 즉시 자동 로그인
        if (!p.requirePin || !p.pin) {
            handleQuickLogin(p.id, '');
        }
    };

    const handleQuickLogin = async (pId: string, enteredPin: string) => {
        setIsSubmitting(true);
        setErrorMsg('');
        try {
            await loginWithProfile(pId, enteredPin, rememberMe);
            toast.success(`${selectedProfile?.name || '사용자'}님 환영합니다!`);
        } catch (err: any) {
            setErrorMsg(err.message || '로그인에 실패했습니다.');
            setPin('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeypadPress = (digit: string) => {
        if (pin.length < 6) {
            const nextPin = pin + digit;
            setPin(nextPin);
            setErrorMsg('');
            // 4자리 입력 시 자동 로그인 시도
            if (nextPin.length === 4 && selectedProfile?.pin?.length === 4) {
                handleQuickLogin(selectedProfileId, nextPin);
            }
        }
    };

    const handleKeypadDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setErrorMsg('');
    };

    const handleKeypadClear = () => {
        setPin('');
        setErrorMsg('');
    };

    return (
        <div className="flex items-center justify-center min-h-screen w-screen bg-gradient-to-tr from-background via-muted/30 to-primary/5 font-sans select-none relative overflow-hidden text-foreground p-4">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none" />

            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-400">
                <div className="bg-card/90 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center relative">
                    
                    {/* Brand Logo & Title */}
                    <div className="flex items-center gap-2.5 mb-2 font-bold tracking-tight">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/25">
                            <Zap className="w-5 h-5 text-primary-foreground fill-current" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-foreground tracking-tight">ViraLoop</span>
                            <span className="text-[10px] font-bold text-primary tracking-wider uppercase bg-primary/10 px-1.5 py-0.5 rounded-md">PRO Hub</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mb-6">
                        스마트폰 & PC 어디서든 원클릭 빠른 접속
                    </p>

                    {/* 1. Profile Select Cards */}
                    <div className="w-full mb-6">
                        <label className="text-[11px] font-bold text-muted-foreground mb-2 block text-center">
                            접속할 프로필을 선택하세요
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {profiles.map((p: any) => {
                                const isSelected = p.id === selectedProfileId;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSelectProfile(p)}
                                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                                            isSelected 
                                                ? 'border-primary bg-primary/10 shadow-sm scale-[1.02]' 
                                                : 'border-border/70 bg-muted/30 hover:bg-muted/60'
                                        }`}
                                    >
                                        <span className="text-2xl">{p.avatar || '👤'}</span>
                                        <span className="text-xs font-bold text-foreground truncate w-full text-center">
                                            {p.name.split(' ')[0]}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground font-medium">
                                            {!p.requirePin ? '⚡ 바로 입장' : '🔒 PIN 보호'}
                                        </span>
                                        {isSelected && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. PIN Input Section (If required) */}
                    {selectedProfile?.requirePin ? (
                        <div className="w-full space-y-4 flex flex-col items-center">
                            {/* PIN Display Dots */}
                            <div className="space-y-1.5 text-center">
                                <span className="text-xs font-bold text-foreground">
                                    {selectedProfile.name} PIN 번호 (4자리)
                                </span>
                                <div className="flex items-center justify-center gap-3 py-2">
                                    {[0, 1, 2, 3].map(idx => (
                                        <div
                                            key={idx}
                                            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                                                pin.length > idx 
                                                    ? 'bg-primary border-primary scale-110 shadow-xs shadow-primary/50' 
                                                    : 'border-border bg-background'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {errorMsg && (
                                <div className="w-full p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-xs font-bold text-rose-500 animate-in fade-in">
                                    ⚠️ {errorMsg}
                                </div>
                            )}

                            {/* Keypad Grid (Touch Optimized for Mobile) */}
                            <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleKeypadPress(num)}
                                        disabled={isSubmitting}
                                        className="h-12 rounded-2xl bg-muted/40 hover:bg-muted active:scale-95 border border-border/60 text-base font-bold text-foreground flex items-center justify-center transition-all shadow-2xs"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleKeypadClear}
                                    className="h-12 rounded-2xl bg-muted/20 hover:bg-muted/40 text-xs font-bold text-muted-foreground flex items-center justify-center active:scale-95 transition-all"
                                >
                                    초기화
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleKeypadPress('0')}
                                    disabled={isSubmitting}
                                    className="h-12 rounded-2xl bg-muted/40 hover:bg-muted active:scale-95 border border-border/60 text-base font-bold text-foreground flex items-center justify-center transition-all shadow-2xs"
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    onClick={handleKeypadDelete}
                                    className="h-12 rounded-2xl bg-muted/20 hover:bg-muted/40 text-muted-foreground flex items-center justify-center active:scale-95 transition-all"
                                >
                                    <Delete className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Submit Button */}
                            <Button
                                onClick={() => handleQuickLogin(selectedProfileId, pin)}
                                disabled={isSubmitting || pin.length < 4}
                                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl gap-2 mt-2 shadow-sm active:scale-98"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        인증 확인 중...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        ViraLoop 시작하기
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        /* Direct Login Button for No-PIN profiles */
                        <div className="w-full space-y-3">
                            <Button
                                onClick={() => handleQuickLogin(selectedProfileId, '')}
                                disabled={isSubmitting}
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl gap-2 shadow-md active:scale-98 text-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                {selectedProfile.name}으로 즉시 시작
                            </Button>
                        </div>
                    )}

                    {/* 3. Footer Options */}
                    <div className="mt-6 pt-4 border-t border-border/60 w-full flex items-center justify-between text-xs text-muted-foreground">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            <span>자동 로그인 유지</span>
                        </label>
                        <span className="text-[10px] text-muted-foreground/80 font-mono">
                            기본 PIN: 1234
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
}
