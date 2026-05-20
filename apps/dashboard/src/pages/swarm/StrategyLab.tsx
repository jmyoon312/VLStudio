import React from 'react';
import { FileText, RefreshCw, PenLine } from 'lucide-react';

export default function StrategyLab() {
    return (
        <div className="flex flex-col h-full bg-background font-sans p-6 overflow-y-auto text-foreground">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                        <FileText className="w-7 h-7 text-primary" />
                        소버린 전략 연구소
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">추출된 채널 시그니처 DNA 및 콘텐츠 기획 문서 조회</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-full text-sm font-bold shadow-sm hover:bg-muted transition-colors">
                        <RefreshCw className="w-4 h-4" /> 동기화
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-black tracking-wide shadow-md shadow-primary/20 hover:bg-primary-hover transition-all">
                        <PenLine className="w-4 h-4" /> 전략 문서 새로 만들기
                    </button>
                </div>
            </div>

            <div className="flex gap-6 h-full">
                {/* Left Panel: Brief List */}
                <div className="w-80 bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 ml-2">전략 리포트 목록</h3>
                    <div className="flex-1 border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center">
                        <span className="text-sm text-muted-foreground font-medium">로딩 중...</span>
                    </div>
                </div>

                {/* Right Panel: Markdown Document Viewer */}
                <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
                    <div className="h-14 border-b border-border bg-muted/30 flex items-center px-6">
                        <h2 className="text-sm font-bold text-foreground">문서 뷰어</h2>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto prose prose-slate max-w-none text-foreground">
                        <div className="border-2 border-dashed border-border/60 rounded-xl h-full flex items-center justify-center">
                            <span className="text-sm text-muted-foreground font-medium">전략 리포트를 선택해주세요.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
