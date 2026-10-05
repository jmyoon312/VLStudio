import { api } from '@/lib/api';

export interface DirectorProject {
    id: string;
    name: string;
    color: string;
    icon: string;
    thread_count: number;
    created_at?: string;
    updated_at?: string;
}

export interface DirectorThread {
    id: string;
    project_id?: string;
    title: string;
    preset_id?: string;
    provider?: string;
    model?: string;
    reasoning_effort?: string;
    is_pinned?: boolean;
    is_archived?: boolean;
    message_count: number;
    created_at?: string;
    updated_at?: string;
}

export interface DirectorMessageData {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    steps?: any[];
    deliverable?: any;
    created_preset?: any;
    attachments?: any[];
    tasks?: any[];
    action_chips?: string[];
    created_at?: string;
}

async function requestWithFallback<T>(path: string, method: 'get' | 'post' | 'put' | 'delete' = 'get', body?: any): Promise<T> {
    try {
        const primaryUrl = `/director${path}`;
        const res = method === 'get' ? await api.get(primaryUrl)
            : method === 'post' ? await api.post(primaryUrl, body)
            : method === 'put' ? await api.put(primaryUrl, body)
            : await api.delete(primaryUrl);
        return res.data;
    } catch (err: any) {
        if (err.response?.status === 404 || err.response?.status === 500) {
            // Fallback to /sovereign-presets/director path
            const fallbackUrl = `/sovereign-presets/director${path}`;
            const res = method === 'get' ? await api.get(fallbackUrl)
                : method === 'post' ? await api.post(fallbackUrl, body)
                : method === 'put' ? await api.put(fallbackUrl, body)
                : await api.delete(fallbackUrl);
            return res.data;
        }
        throw err;
    }
}

export const directorSessionService = {
    // Projects
    async getProjects(): Promise<DirectorProject[]> {
        return requestWithFallback<DirectorProject[]>('/projects');
    },

    async createProject(name: string, color = 'emerald', icon = 'folder'): Promise<{ status: string; project: DirectorProject }> {
        return requestWithFallback<{ status: string; project: DirectorProject }>('/projects', 'post', { name, color, icon });
    },

    async updateProject(id: string, name?: string, color?: string): Promise<{ status: string; project: DirectorProject }> {
        return requestWithFallback<{ status: string; project: DirectorProject }>(`/projects/${id}`, 'put', { name, color });
    },

    async deleteProject(id: string): Promise<{ status: string }> {
        return requestWithFallback<{ status: string }>(`/projects/${id}`, 'delete');
    },

    // Threads
    async getThreads(projectId?: string): Promise<DirectorThread[]> {
        const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
        return requestWithFallback<DirectorThread[]>(`/threads${query}`);
    },

    async createThread(data: {
        id?: string;
        project_id?: string;
        title?: string;
        preset_id?: string;
        provider?: string;
        model?: string;
        reasoning_effort?: string;
    }): Promise<{ status: string; thread: DirectorThread }> {
        return requestWithFallback<{ status: string; thread: DirectorThread }>('/threads', 'post', data);
    },

    async updateThread(id: string, data: Partial<DirectorThread>): Promise<{ status: string; thread: DirectorThread }> {
        return requestWithFallback<{ status: string; thread: DirectorThread }>(`/threads/${id}`, 'put', data);
    },

    async deleteThread(id: string): Promise<{ status: string }> {
        return requestWithFallback<{ status: string }>(`/threads/${id}`, 'delete');
    },

    // Messages
    async getThreadMessages(threadId: string): Promise<DirectorMessageData[]> {
        const res = await requestWithFallback<any>(`/threads/${threadId}/messages`);
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.messages)) return res.messages;
        return [];
    },

    async saveThreadMessage(threadId: string, message: DirectorMessageData): Promise<{ status: string; message: DirectorMessageData }> {
        return requestWithFallback<{ status: string; message: DirectorMessageData }>(`/threads/${threadId}/messages`, 'post', message);
    }
};
