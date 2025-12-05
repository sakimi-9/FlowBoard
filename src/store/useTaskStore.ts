import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Column, FilterState, ColumnId, ThemePreference } from '@/types';
import { isAfter, addDays } from 'date-fns';

type ImportPayload = {
    tasks: Record<string, Task>;
    columns: Record<ColumnId, Column>;
    columnOrder?: ColumnId[];
    filters?: FilterState;
    theme?: ThemePreference;
    version?: string;
    exportedAt?: number;
};

interface TaskState {
    tasks: Record<string, Task>;
    columns: Record<ColumnId, Column>;
    columnOrder: ColumnId[];
    filters: FilterState;
    theme: ThemePreference;

    // Actions
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'isArchived'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void; // Soft delete
    restoreTask: (id: string) => void;
    unarchiveTask: (id: string) => void;
    permanentlyDeleteTask: (id: string) => void;
    moveTask: (taskId: string, sourceColId: ColumnId, destColId: ColumnId, sourceIndex: number, destIndex: number) => void;
    reorderColumn: (newOrder: ColumnId[]) => void;
    setFilters: (filters: Partial<FilterState>) => void;
    toggleTheme: () => void;
    checkAutoArchive: () => void;
    importData: (data: ImportPayload) => void;
    getTaskStats: () => {
        today: { total: number; done: number };
        general: { total: number; done: number };
    };
}

const initialColumns: Record<ColumnId, Column> = {
    'todo': { id: 'todo', title: '待办', taskIds: [] },
    'in-progress': { id: 'in-progress', title: '进行中', taskIds: [] },
    'done': { id: 'done', title: '已完成', taskIds: [] },
};

const initialColumnOrder: ColumnId[] = ['todo', 'in-progress', 'done'];

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: {},
            columns: initialColumns,
            columnOrder: initialColumnOrder,
            filters: {
                search: '',
                tags: [],
                priority: [],
                category: 'all',
            },
            theme: {
                mode: 'light',
            }, addTask: (taskData) => set((state) => {
                const id = uuidv4();
                const now = Date.now();
                const newTask: Task = {
                    id,
                    ...taskData,
                    category: taskData.category || 'general',
                    status: 'todo',
                    createdAt: now,
                    updatedAt: now,
                    isArchived: false,
                }; const newColumns = { ...state.columns };
                newColumns['todo'].taskIds.push(id);

                return {
                    tasks: { ...state.tasks, [id]: newTask },
                    columns: newColumns,
                };
            }),

            updateTask: (id, updates) => set((state) => {
                const task = state.tasks[id];
                if (!task) return state;

                const updatedTask = { ...task, ...updates, updatedAt: Date.now() };

                // If status changed to done, set completedAt
                if (updates.status === 'done' && task.status !== 'done') {
                    updatedTask.completedAt = Date.now();
                } else if (updates.status && updates.status !== 'done') {
                    updatedTask.completedAt = undefined;
                }

                return {
                    tasks: { ...state.tasks, [id]: updatedTask },
                };
            }),

            deleteTask: (id) => set((state) => {
                const task = state.tasks[id];
                if (!task) return state;

                // Remove from column if it's in one
                const newColumns = { ...state.columns };
                const colId = task.status as ColumnId;
                if (newColumns[colId]) {
                    newColumns[colId].taskIds = newColumns[colId].taskIds.filter((taskId: string) => taskId !== id);
                }

                return {
                    tasks: { ...state.tasks, [id]: { ...task, status: 'deleted', updatedAt: Date.now() } },
                    columns: newColumns,
                };
            }),

            restoreTask: (id) => set((state) => {
                const task = state.tasks[id];
                if (!task || task.status !== 'deleted') return state;

                // Restore to 'todo' by default or maybe track previous status? 
                // For simplicity, restore to 'todo'
                const newStatus: ColumnId = 'todo';
                const newColumns = { ...state.columns };
                newColumns[newStatus].taskIds.push(id);

                return {
                    tasks: { ...state.tasks, [id]: { ...task, status: newStatus, updatedAt: Date.now() } },
                    columns: newColumns,
                };
            }),

            unarchiveTask: (id) => set((state) => {
                const task = state.tasks[id];
                if (!task || !task.isArchived) return state;

                const newColumns = { ...state.columns };
                // Restore to 'done'
                newColumns['done'].taskIds.push(id);

                return {
                    tasks: { ...state.tasks, [id]: { ...task, isArchived: false } },
                    columns: newColumns,
                };
            }),

            permanentlyDeleteTask: (id) => set((state) => {
                const remainingTasks = { ...state.tasks };
                delete remainingTasks[id];
                return { tasks: remainingTasks };
            }),

            moveTask: (taskId, sourceColId, destColId, sourceIndex, destIndex) => set((state) => {
                const newColumns = { ...state.columns };
                const sourceTaskIds = Array.from(newColumns[sourceColId].taskIds);
                const destTaskIds = sourceColId === destColId ? sourceTaskIds : Array.from(newColumns[destColId].taskIds);

                // Remove from source
                sourceTaskIds.splice(sourceIndex, 1);

                // Add to dest
                destTaskIds.splice(destIndex, 0, taskId);

                newColumns[sourceColId] = { ...newColumns[sourceColId], taskIds: sourceTaskIds };
                newColumns[destColId] = { ...newColumns[destColId], taskIds: destTaskIds };

                // Update task status
                const updatedTasks = { ...state.tasks };
                if (sourceColId !== destColId) {
                    updatedTasks[taskId] = {
                        ...updatedTasks[taskId],
                        status: destColId,
                        updatedAt: Date.now(),
                        completedAt: destColId === 'done' ? Date.now() : undefined
                    };
                }

                return {
                    columns: newColumns,
                    tasks: updatedTasks,
                };
            }),

            reorderColumn: (newOrder) => set({ columnOrder: newOrder }),

            setFilters: (filters) => set((state) => ({
                filters: { ...state.filters, ...filters },
            })),

            toggleTheme: () => set((state) => ({
                theme: { mode: state.theme.mode === 'light' ? 'dark' : 'light' },
            })),

            importData: (data) => set((state) => {
                if (!data || !data.tasks || !data.columns) {
                    console.error('Invalid data format');
                    return state;
                }
                return {
                    ...state,
                    tasks: data.tasks,
                    columns: data.columns,
                    columnOrder: data.columnOrder || state.columnOrder,
                    filters: data.filters || state.filters,
                    theme: data.theme || state.theme,
                };
            }),

            checkAutoArchive: () => set((state) => {
                const now = Date.now();
                const newTasks = { ...state.tasks };
                let hasChanges = false;
                const newColumns = { ...state.columns };

                Object.values(newTasks).forEach((task) => {
                    if (task.status === 'done' && task.completedAt && !task.isArchived) {
                        // Check if completed > 24 hours ago
                        if (isAfter(now, addDays(task.completedAt, 1))) {
                            newTasks[task.id] = { ...task, isArchived: true };
                            hasChanges = true;

                            // Remove from 'done' column
                            newColumns['done'].taskIds = newColumns['done'].taskIds.filter((id: string) => id !== task.id);
                        }
                    }
                });

                if (!hasChanges) return state;
                return { tasks: newTasks, columns: newColumns };
            }),

            getTaskStats: () => {
                const state = get();
                const tasks = Object.values(state.tasks).filter(t => t.status !== 'deleted' && !t.isArchived);

                const todayTasks = tasks.filter(t => t.category === 'today');
                const generalTasks = tasks.filter(t => t.category === 'general' || !t.category);

                return {
                    today: {
                        total: todayTasks.length,
                        done: todayTasks.filter(t => t.status === 'done').length
                    },
                    general: {
                        total: generalTasks.length,
                        done: generalTasks.filter(t => t.status === 'done').length
                    }
                };
            },
        }),
        {
            name: 'flowboard-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
