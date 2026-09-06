import React, { useState } from 'react';
import { 
    Search, Plus, Layers, Sparkles, Globe, FolderOpen, 
    Radio, PenTool, Zap, Mic, Film, ShieldAlert, CheckCircle2, 
    Volume2, Music, Sliders, Scissors, Maximize, Package, Send,
    ChevronDown, ChevronRight
} from 'lucide-react';
import { LEGO_CATEGORIES, LEGO_NODE_TEMPLATES, LegoNodeTemplate } from './pipelineData';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const ICON_MAP: Record<string, React.FC<any>> = {
    Globe, FolderOpen, Radio, PenTool, Zap, Mic, Film, 
    ShieldAlert, CheckCircle2, Volume2, Music, Sparkles, 
    Sliders, Scissors, Maximize, Layers, Package, Send
};

interface NodePaletteProps {
    onAddNode: (template: LegoNodeTemplate) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        ingest: true,
        script: true,
        critic: true,
        audio: true,
        visual: true,
        cutter: true,
        assemble: true,
        deploy: true
    });

    const toggleCategory = (catId: string) => {
        setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const filteredTemplates = LEGO_NODE_TEMPLATES.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-80 h-full border-r border-border bg-card/60 backdrop-blur-md flex flex-col shrink-0 select-none overflow-hidden">
            {/* Palette Header */}
            <div className="p-3.5 border-b border-border space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Layers className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black text-foreground">레고 블록 보관함</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-bold text-muted-foreground">
                        총 {LEGO_NODE_TEMPLATES.length}종
                    </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="작업 노드 검색 (예: 캡컷, 자막, TTS)..."
                        className="pl-8 h-8 text-xs bg-muted/30 border-border/80 rounded-xl"
                    />
                </div>
            </div>

            {/* Draggable Templates List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {searchQuery ? (
                    <div className="space-y-2">
                        {filteredTemplates.map(template => {
                            const IconComp = ICON_MAP[template.iconName] || Layers;
                            return (
                                <div
                                    key={template.type}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, template.type)}
                                    onClick={() => onAddNode(template)}
                                    className="p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-blue-500/40 transition-all cursor-grab active:cursor-grabbing shadow-2xs group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-lg border", template.categoryColor)}>
                                                <IconComp className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {template.title}
                                            </span>
                                        </div>
                                        <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-600" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                                        {template.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    LEGO_CATEGORIES.map(cat => {
                        const items = LEGO_NODE_TEMPLATES.filter(t => t.category === cat.id);
                        if (items.length === 0) return null;
                        const isOpen = openCategories[cat.id] ?? true;

                        return (
                            <div key={cat.id} className="space-y-1.5">
                                <button
                                    onClick={() => toggleCategory(cat.id)}
                                    className="w-full flex items-center justify-between py-1 px-1 text-[11px] font-black text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <span>{cat.label} ({items.length})</span>
                                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>

                                {isOpen && (
                                    <div className="space-y-1.5 pl-1">
                                        {items.map(template => {
                                            const IconComp = ICON_MAP[template.iconName] || Layers;
                                            return (
                                                <div
                                                    key={template.type}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, template.type)}
                                                    onClick={() => onAddNode(template)}
                                                    className="p-2.5 rounded-xl border border-border/60 bg-muted/15 hover:bg-muted/40 hover:border-blue-500/40 transition-all cursor-grab active:cursor-grabbing shadow-2xs group flex flex-col gap-1"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={cn("p-1 rounded-md border shrink-0", template.categoryColor)}>
                                                                <IconComp className="w-3 h-3" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                                                {template.title}
                                                            </span>
                                                        </div>
                                                        <Plus className="w-3 h-3 text-muted-foreground group-hover:text-blue-600 shrink-0" />
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground line-clamp-1">
                                                        {template.desc}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Drag helper tooltip */}
            <div className="p-2.5 border-t border-border bg-muted/20 text-center">
                <p className="text-[10px] text-muted-foreground">
                    💡 카드를 클릭하거나 캔버스로 드래그하여 배치하세요.
                </p>
            </div>
        </div>
    );
};

export default NodePalette;
