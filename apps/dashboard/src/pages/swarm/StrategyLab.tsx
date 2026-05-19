import React from 'react';
import { FileText, RefreshCw, PenLine } from 'lucide-react';

export default function StrategyLab() {
    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-7 h-7 text-indigo-600" />
                        소버린 전략 연구소
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">추출된 채널 시그니처 DNA 및 콘텐츠 기획 문서 조회</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors">
                        <RefreshCw className="w-4 h-4" /> 동기화
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-black tracking-wide shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all">
                        <PenLine className="w-4 h-4" /> 전략 문서 새로 만들기
                    </button>
                </div>
            </div>

            <div className="flex gap-6 h-full">
                {/* Left Panel: Brief List */}
                <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">전략 리포트 목록</h3>
                    <div className="flex-1 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center">
                        <span className="text-sm text-slate-400 font-medium">로딩 중...</span>
                    </div>
                </div>

                {/* Right Panel: Markdown Document Viewer */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="h-14 border-b border-slate-100 bg-slate-50/50 flex items-center px-6">
                        <h2 className="text-sm font-bold text-slate-700">문서 뷰어</h2>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto prose prose-slate max-w-none">
                        <div className="border-2 border-dashed border-slate-100 rounded-xl h-full flex items-center justify-center">
                            <span className="text-sm text-slate-400 font-medium">전략 리포트를 선택해주세요.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
