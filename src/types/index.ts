export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'deleted';
export type ColumnId = 'todo' | 'in-progress' | 'done';
export type TaskCategory = 'today' | 'general';

export interface Task {
    id: string;
    title: string;
    description?: string;
    priority: Priority;
    status: TaskStatus;
    category: TaskCategory; // 新增分类
    tags: string[];
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    isArchived: boolean;
}

export interface FilterState {
    search: string;
    tags: string[];
    priority: Priority[];
    category: TaskCategory | 'all'; // 新增分类过滤
}

export interface Column {
    id: ColumnId;
    title: string;
    taskIds: string[];
}

export interface ThemePreference {
    mode: 'light' | 'dark';
}
