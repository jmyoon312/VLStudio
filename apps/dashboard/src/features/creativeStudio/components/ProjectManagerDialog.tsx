import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    FolderOpen, Search, Plus, Trash2, Copy, Film, Sparkles,
    Calendar, Clock, Check, RefreshCw, LayoutGrid, List, ArrowUpDown, Image as ImageIcon,
    Music, Video, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentProjectName: string;
    onSelectProject: (projectName: string) => Promise<void>;
    onCreateProject: (projectName: string, initialScript?: string) => Promise<void>;
}

export const ProjectManagerDialog: React.FC<ProjectManagerDialogProps> = ({
    open,
    onOpenChange,
    currentProjectName,
    onSelectProject,
    onCreateProject,
}) => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'mtime' | 'created_at' | 'name' | 'scene_count'>('mtime');
    const [filterType, setFilterType] = useState<'all' | 'with_scenes' | 'with_media'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

    const generateDefaultName = () => {
        const d = new Date();
        const yy = String(d.getFullYear()).slice(2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `project_${yy}${mm}${dd}_${hh}${min}`;
    };

    const [newProjectName, setNewProjectName] = useState(generateDefaultName);
    const [newProjectScript, setNewProjectScript] = useState('');

    const { data: projects = [], isLoading, refetch } = useQuery({
        queryKey: ['creativeProjects'],
        queryFn: async () => {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.listProjects) {
                try {
                    const res = await apiObj.listProjects();
                    if (res?.success && Array.isArray(res.projects)) {
                        return res.projects;
                    }
                } catch (e) {
                    console.warn('[listProjects electron IPC error]', e);
                }
            }
            try {
                const res = await api.get('/creative/projects');
                return res.data || [];
            } catch {
                return [];
            }
        },
        enabled: open
    });

    const deleteMutation = useMutation({
        mutationFn: async (projectName: string) => {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.deleteProject) {
                const res = await apiObj.deleteProject({ project: projectName });
                if (res?.success) return res;
            }
            return (await api.delete(`/creative/projects/${projectName}`)).data;
        },
        onSuccess: (_, projectName) => {
            toast.success(`프로젝트 '${projectName}' 삭제 완료`);
            queryClient.invalidateQueries({ queryKey: ['creativeProjects'] });
        },
        onError: (err: any) => {
            toast.error(`프로젝트 삭제 실패: ${err.message || err}`);
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: async (projectName: string) => {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.duplicateProject) {
                const res = await apiObj.duplicateProject({ project: projectName });
                if (res?.success) return res;
            }
            return (await api.post(`/creative/projects/${projectName}/duplicate`)).data;
        },
        onSuccess: (data) => {
            toast.success(`프로젝트 복제 완료: ${data.new_project_name}`);
            queryClient.invalidateQueries({ queryKey: ['creativeProjects'] });
        },
        onError: (err: any) => {
            toast.error(`프로젝트 복제 실패: ${err.message || err}`);
        }
    });

    const filteredProjects = useMemo(() => {
        return projects.filter((p: any) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = (p.name || '').toLowerCase().includes(q);
                const matchScript = (p.script_preview || '').toLowerCase().includes(q);
                if (!matchName && !matchScript) return false;
            }
            if (filterType === 'with_scenes' && (p.scene_count || 0) === 0) return false;
            if (filterType === 'with_media' && !p.has_images && !p.has_videos && !p.has_audio) return false;
            return true;
        }).sort((a: any, b: any) => {
            if (sortBy === 'mtime') return (b.mtime || 0) - (a.mtime || 0);
            if (sortBy === 'created_at') return (b.created_at || '').localeCompare(a.created_at || '');
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'scene_count') return (b.scene_count || 0) - (a.scene_count || 0);
            return 0;
        });
    }, [projects, searchQuery, sortBy, filterType]);

    const handleOpenInExplorer = async (projectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const apiObj = (window as any).electronAPI;
            if (apiObj?.openProjectFolder) {
                const res = await apiObj.openProjectFolder(projectName);
                if (res?.success) toast.success(`폴더 열기: 05_Exports/${projectName}`);
            }
        } catch (err: any) {
            toast.error('폴더 열기 실패: ' + err.message);
        }
    };

    const handleDelete = async (projectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (projectName === currentProjectName) {
            if (!confirm(`현재 열려있는 프로젝트 '${projectName}'입니다. 정말 삭제하시겠습니까?`)) return;
        } else {
            if (!confirm(`프로젝트 '${projectName}' 및 모든 생성 파일을 디스크에서 영구 삭제하시겠습니까?`)) return;
        }
        deleteMutation.mutate(projectName);
    };

    const handleDuplicate = async (projectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        duplicateMutation.mutate(projectName);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) {
            toast.error('프로젝트 이름을 입력해주세요.');
            return;
        }
        const sanitized = newProjectName.trim().replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 30);
        const finalName = sanitized.startsWith('project_') ? sanitized : `project_${sanitized}`;
        
        await onCreateProject(finalName, newProjectScript);
        setActiveTab('list');
        setNewProjectName(generateDefaultName());
        setNewProjectScript('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl'>
                <DialogHeader className='p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between'>
                    <div>
                        <DialogTitle className='text-lg font-bold flex items-center gap-2 text-foreground'>
                            <FolderOpen className='w-5 h-5 text-amber-500' />
                            <span>05_Exports 작업 프로젝트 관리자</span>
                            <Badge variant='outline' className='text-xs ml-1 font-mono'>
                                {projects.length}개 프로젝트
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                            로컬 디스크(05_Exports)에 저장된 모든 프로젝트를 검색, 선택, 복제 및 생성합니다.
                        </DialogDescription>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className='w-auto'>
                        <TabsList className='h-8 bg-muted p-0.5'>
                            <TabsTrigger value='list' className='text-xs px-3 h-7 font-bold gap-1.5'>
                                <Film className='w-3.5 h-3.5' /> 프로젝트 목록
                            </TabsTrigger>
                            <TabsTrigger value='create' className='text-xs px-3 h-7 font-bold gap-1.5 text-primary'>
                                <Plus className='w-3.5 h-3.5' /> 새 프로젝트
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto p-5'>
                    {activeTab === 'list' ? (
                        <div className='space-y-4'>
                            <div className='flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border/60'>
                                <div className='relative flex-1 min-w-[220px]'>
                                    <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder='프로젝트 이름 또는 대본 검색...'
                                        className='h-8 pl-9 pr-3 text-xs bg-background'
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground'
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className='flex items-center gap-1.5'>
                                    <button
                                        type='button'
                                        onClick={() => setFilterType('all')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${filterType === 'all' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                    >
                                        전체
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setFilterType('with_scenes')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${filterType === 'with_scenes' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                    >
                                        씬 있음
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setFilterType('with_media')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${filterType === 'with_media' ? 'bg-primary text-primary-foreground font-bold' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                                    >
                                        미디어 생성됨
                                    </button>
                                </div>

                                <div className='flex items-center gap-2'>
                                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                        <SelectTrigger className='h-8 w-32 text-xs bg-background'>
                                            <ArrowUpDown className='w-3 h-3 mr-1 text-muted-foreground' />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='mtime'>최근 수정순</SelectItem>
                                            <SelectItem value='created_at'>생성일순</SelectItem>
                                            <SelectItem value='name'>이름순</SelectItem>
                                            <SelectItem value='scene_count'>씬 개수순</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className='flex bg-background border border-border rounded-md p-0.5'>
                                        <button
                                            type='button'
                                            onClick={() => setViewMode('grid')}
                                            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                            title='그리드 뷰'
                                        >
                                            <LayoutGrid className='w-3.5 h-3.5' />
                                        </button>
                                        <button
                                            type='button'
                                            onClick={() => setViewMode('list')}
                                            className={`p-1 rounded ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                            title='리스트 뷰'
                                        >
                                            <List className='w-3.5 h-3.5' />
                                        </button>
                                    </div>

                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => refetch()}
                                        className='h-8 px-2 text-muted-foreground hover:text-foreground'
                                        title='새로고침'
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </div>

                            {filteredProjects.length === 0 ? (
                                <div className='py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2'>
                                    <FolderOpen className='w-10 h-10 text-muted-foreground/40' />
                                    <p className='text-sm font-medium'>검색 조건에 맞는 프로젝트가 없습니다.</p>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => setActiveTab('create')}
                                        className='mt-2 text-xs font-bold gap-1.5'
                                    >
                                        <Plus className='w-3.5 h-3.5' /> 새 프로젝트 생성하기
                                    </Button>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'>
                                    {filteredProjects.map((proj: any) => {
                                        const isCurrent = proj.name === currentProjectName;
                                        return (
                                            <div
                                                key={proj.name}
                                                onClick={() => {
                                                    onSelectProject(proj.name);
                                                    onOpenChange(false);
                                                }}
                                                className={`group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${isCurrent ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20' : 'bg-card border-border/80 hover:border-primary/30'}`}
                                            >
                                                <div>
                                                    <div className='flex items-start justify-between gap-2 mb-2'>
                                                        <div className='flex items-center gap-1.5 min-w-0'>
                                                            <FolderOpen className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-primary' : 'text-amber-500'}`} />
                                                            <span className='text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors'>
                                                                {proj.name}
                                                            </span>
                                                        </div>
                                                        {isCurrent && (
                                                            <Badge className='h-4 px-1.5 text-[9px] font-bold shrink-0 bg-primary text-primary-foreground'>
                                                                현재 활성
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className='w-full h-24 rounded-lg bg-muted/60 border border-border/40 overflow-hidden mb-2.5 flex items-center justify-center relative'>
                                                        {proj.thumbnail_url ? (
                                                            <img
                                                                src={proj.thumbnail_url}
                                                                alt={proj.name}
                                                                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                                                            />
                                                        ) : (
                                                            <div className='p-2.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-4 select-none'>
                                                                {proj.script_preview || '대본 내용 없음 (빈 프로젝트)'}
                                                            </div>
                                                        )}

                                                        <div className='absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-background/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] text-muted-foreground'>
                                                            {proj.has_audio && <Music className='w-3 h-3 text-cyan-500' title='오디오 있음' />}
                                                            {proj.has_images && <ImageIcon className='w-3 h-3 text-amber-500' title='이미지 있음' />}
                                                            {proj.has_videos && <Video className='w-3 h-3 text-purple-500' title='영상 있음' />}
                                                        </div>
                                                    </div>

                                                    <div className='flex items-center justify-between text-[11px] text-muted-foreground mb-3'>
                                                        <span className='font-semibold text-foreground/80'>
                                                            {proj.scene_count > 0 ? `${proj.scene_count}개 씬` : '씬 없음'}
                                                        </span>
                                                        <span className='text-[10px] flex items-center gap-1'>
                                                            <Clock className='w-3 h-3 opacity-60' />
                                                            {proj.updated_at?.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className='flex items-center justify-between gap-1 pt-2 border-t border-border/50'>
                                                    <Button
                                                        size='sm'
                                                        variant={isCurrent ? 'secondary' : 'default'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectProject(proj.name);
                                                            onOpenChange(false);
                                                        }}
                                                        className='h-7 text-xs px-3 font-bold flex-1'
                                                    >
                                                        {isCurrent ? '현재 작업 중' : '열기'}
                                                    </Button>

                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        onClick={(e) => handleOpenInExplorer(proj.name, e)}
                                                        className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground'
                                                        title='탐색기에서 열기'
                                                    >
                                                        <ExternalLink className='w-3.5 h-3.5' />
                                                    </Button>

                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        onClick={(e) => handleDuplicate(proj.name, e)}
                                                        className='h-7 w-7 p-0 text-muted-foreground hover:text-foreground'
                                                        title='프로젝트 복제'
                                                    >
                                                        <Copy className='w-3.5 h-3.5' />
                                                    </Button>

                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        onClick={(e) => handleDelete(proj.name, e)}
                                                        className='h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10'
                                                        title='프로젝트 삭제'
                                                    >
                                                        <Trash2 className='w-3.5 h-3.5' />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className='space-y-1.5'>
                                    {filteredProjects.map((proj: any) => {
                                        const isCurrent = proj.name === currentProjectName;
                                        return (
                                            <div
                                                key={proj.name}
                                                onClick={() => {
                                                    onSelectProject(proj.name);
                                                    onOpenChange(false);
                                                }}
                                                className={`flex items-center justify-between p-2.5 px-3 rounded-lg border transition-all cursor-pointer ${isCurrent ? 'bg-primary/5 border-primary/40 font-medium' : 'bg-card border-border/70 hover:bg-muted/40'}`}
                                            >
                                                <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                    <FolderOpen className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-primary' : 'text-amber-500'}`} />
                                                    <div className='flex flex-col min-w-0 flex-1'>
                                                        <div className='flex items-center gap-2'>
                                                            <span className='text-xs font-bold text-foreground truncate'>{proj.name}</span>
                                                            {isCurrent && (
                                                                <Badge className='h-4 px-1.5 text-[9px] font-bold bg-primary text-primary-foreground'>
                                                                    현재
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className='text-[10.5px] text-muted-foreground truncate'>
                                                            {proj.script_preview || '대본 내용 없음'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className='flex items-center gap-4 shrink-0 ml-3'>
                                                    <div className='text-right text-[11px]'>
                                                        <div className='font-semibold text-foreground/80'>{proj.scene_count}개 씬</div>
                                                        <div className='text-[10px] text-muted-foreground'>{proj.updated_at?.split(' ')[0]}</div>
                                                    </div>

                                                    <div className='flex items-center gap-1'>
                                                        <Button
                                                            size='sm'
                                                            variant={isCurrent ? 'secondary' : 'default'}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectProject(proj.name);
                                                                onOpenChange(false);
                                                            }}
                                                            className='h-6 text-xs px-2.5 font-bold'
                                                        >
                                                            {isCurrent ? '작업 중' : '열기'}
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            onClick={(e) => handleOpenInExplorer(proj.name, e)}
                                                            className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
                                                        >
                                                            <ExternalLink className='w-3 h-3' />
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            onClick={(e) => handleDelete(proj.name, e)}
                                                            className='h-6 w-6 p-0 text-destructive/70 hover:text-destructive'
                                                        >
                                                            <Trash2 className='w-3 h-3' />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleCreateSubmit} className='max-w-xl mx-auto space-y-4 py-4'>
                            <div className='space-y-1.5'>
                                <label className='text-xs font-bold text-foreground'>
                                    프로젝트 폴더 이름 (05_Exports 하위)
                                </label>
                                <Input
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder='예: project_joseon_ep01'
                                    className='text-xs'
                                    required
                                />
                                <p className='text-[11px] text-muted-foreground'>
                                    영문, 한글, 숫자 및 밑줄(_)을 사용할 수 있습니다.
                                </p>
                            </div>

                            <div className='space-y-1.5'>
                                <label className='text-xs font-bold text-foreground'>
                                    초기 대본 (선택 사항)
                                </label>
                                <textarea
                                    value={newProjectScript}
                                    onChange={(e) => setNewProjectScript(e.target.value)}
                                    placeholder='프로젝트 시작 시 포함할 대본 본문을 입력하세요...'
                                    rows={6}
                                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                                />
                            </div>

                            <div className='pt-3 flex justify-end gap-2'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => setActiveTab('list')}
                                    className='text-xs h-8 font-medium'
                                >
                                    목록으로 돌아가기
                                </Button>
                                <Button
                                    type='submit'
                                    className='text-xs h-8 font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm'
                                >
                                    <Plus className='w-3.5 h-3.5' /> 프로젝트 생성 및 시작
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
