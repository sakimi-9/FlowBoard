import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Button, Input, Select, Space, Modal, Form, Row, Col, Card, Progress, Grid, Drawer, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Column } from '@/components/Column';
import { useTaskStore } from '@/store/useTaskStore';
import type { ColumnId, Task } from '@/types';
import { usePortraitMode } from '@/hooks/usePortraitMode';

type SwipeRule = {
    left?: { target: ColumnId; label: string };
    right?: { target: ColumnId; label: string };
};

type FormValues = {
    title: string;
    description?: string;
    priority: Task['priority'];
    category: Task['category'];
    tags?: string[];
};

const { useBreakpoint } = Grid;

export const Board: React.FC = () => {
    const {
        tasks,
        columns,
        columnOrder,
        moveTask,
        reorderColumn,
        addTask,
        updateTask,
        filters,
        setFilters,
        getTaskStats,
    } = useTaskStore();

    const screens = useBreakpoint();
    const isPortrait = usePortraitMode();
    const isMobileWidth = !screens.sm;
    const isTabletPortrait = screens.md && !screens.lg && isPortrait;
    const isCompactLayout = isMobileWidth || isTabletPortrait;

    const stats = getTaskStats();
    const todayPercent = stats.today.total > 0 ? Math.round((stats.today.done / stats.today.total) * 100) : 0;
    const generalPercent = stats.general.total > 0 ? Math.round((stats.general.done / stats.general.total) * 100) : 0;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [form] = Form.useForm<FormValues>();
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [collapsedColumns, setCollapsedColumns] = useState<Record<ColumnId, boolean>>({
        'todo': false,
        'in-progress': false,
        'done': false,
    });
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);

    const swipeRules = useMemo<Record<ColumnId, SwipeRule>>(() => ({
        'todo': {
            right: { target: 'in-progress', label: '右滑 → 进行中' },
        },
        'in-progress': {
            left: { target: 'todo', label: '左滑 → 待办' },
            right: { target: 'done', label: '右滑 → 已完成' },
        },
        'done': {
            left: { target: 'in-progress', label: '左滑 → 进行中' },
        },
    }), []);

    // 同步拖拽排序与列调整
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;
        if (!destination) return;

        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        if (type === 'column') {
            const newOrder = Array.from(columnOrder);
            newOrder.splice(source.index, 1);
            newOrder.splice(destination.index, 0, draggableId as ColumnId);
            reorderColumn(newOrder);
            return;
        }

        moveTask(
            draggableId,
            source.droppableId as ColumnId,
            destination.droppableId as ColumnId,
            source.index,
            destination.index
        );
    };

    // 打开任务编辑态
    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        form.setFieldsValue({
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            tags: task.tags,
        });
        setIsModalOpen(true);
    };

    // 统一处理新增/编辑提交
    const handleFormSubmit = (values: FormValues) => {
        if (editingTask) {
            updateTask(editingTask.id, {
                title: values.title,
                description: values.description,
                priority: values.priority,
                category: values.category,
                tags: values.tags || [],
            });
        } else {
            addTask({
                title: values.title,
                description: values.description,
                priority: values.priority,
                category: values.category || 'general',
                tags: values.tags || [],
            });
        }
        setIsModalOpen(false);
        setEditingTask(null);
        form.resetFields();
    };

    // 将当前筛选条件应用到任务集合
    const applyFilters = (taskList: Task[]) => {
        let filtered = [...taskList];
        if (filters.search) {
            const keyword = filters.search.toLowerCase();
            filtered = filtered.filter((t) =>
                t.title.toLowerCase().includes(keyword) ||
                (t.description && t.description.toLowerCase().includes(keyword))
            );
        }
        if (filters.priority.length > 0) {
            filtered = filtered.filter((t) => filters.priority.includes(t.priority));
        }
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter((t) => t.category === filters.category);
        }
        return filtered;
    };

    const buildColumnTasks = (columnId: ColumnId) => {
        const column = columns[columnId];
        const mapped = column.taskIds.map((taskId: string) => tasks[taskId]).filter(Boolean) as Task[];
        return applyFilters(mapped);
    };

    const toggleColumnCollapse = (columnId: ColumnId) => {
        setCollapsedColumns((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
    };

    const handleSwipeTask = (task: Task, direction: 'left' | 'right') => {
        const currentStatus = task.status as ColumnId;
        const rule = swipeRules[currentStatus]?.[direction];
        if (!rule) return;
        const targetColumn = columns[rule.target];
        if (!targetColumn) return;
        const sourceIndex = columns[currentStatus].taskIds.indexOf(task.id);
        if (sourceIndex === -1) return;
        const destIndex = targetColumn.taskIds.length;
        moveTask(task.id, currentStatus, rule.target, sourceIndex, destIndex);
        message.success(`已移动至${targetColumn.title}`);
    };

    const renderFilterFields = (fullWidth = false, options?: { onSearchFinished?: () => void }) => (
        <>
            {fullWidth ? (
                // 抽屉中通过 Search 组件提交后立即关闭
                <Input.Search
                    placeholder="搜索任务..."
                    prefix={<SearchOutlined />}
                    style={{ width: '100%' }}
                    value={filters.search}
                    onChange={(e) => setFilters({ search: e.target.value })}
                    enterButton="搜索"
                    onSearch={() => {
                        options?.onSearchFinished?.();
                    }}
                />
            ) : (
                <Input
                    placeholder="搜索任务..."
                    prefix={<SearchOutlined />}
                    style={{ width: fullWidth ? '100%' : screens.xs ? '100%' : 220 }}
                    value={filters.search}
                    onChange={(e) => setFilters({ search: e.target.value })}
                />
            )}
            <Select
                placeholder="任务分类"
                style={{ width: fullWidth ? '100%' : screens.xs ? '100%' : 140 }}
                value={filters.category}
                open={categoryDropdownOpen}
                onOpenChange={(visible) => setCategoryDropdownOpen(visible)}
                onChange={(value) => {
                    setFilters({ category: value });
                    setCategoryDropdownOpen(false);
                }}
                options={[
                    { label: '今日任务', value: 'today' },
                    { label: '普通任务', value: 'general' },
                ]}
            />
            <Select
                mode="multiple"
                placeholder="优先级"
                style={{ width: fullWidth ? '100%' : screens.xs ? '100%' : 220 }}
                value={filters.priority}
                open={priorityDropdownOpen}
                onOpenChange={(visible) => setPriorityDropdownOpen(visible)}
                onChange={(value) => {
                    setFilters({ priority: value });
                    setPriorityDropdownOpen(false);
                }}
                options={[
                    { label: '高优先级', value: 'high' },
                    { label: '中优先级', value: 'medium' },
                    { label: '低优先级', value: 'low' },
                ]}
            />
        </>
    );

    const renderCompactBoard = (columnsPerRow: number) => (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`,
                gap: '16px',
            }}
        >
            {columnOrder.map((columnId, index) => (
                <Column
                    key={columnId}
                    column={columns[columnId]}
                    tasks={buildColumnTasks(columnId)}
                    index={index}
                    onEditTask={handleEditTask}
                    isDragEnabled={false}
                    isCollapsed={!!collapsedColumns[columnId]}
                    onToggleCollapse={toggleColumnCollapse}
                    onTaskSwipe={handleSwipeTask}
                />
            ))}
        </div>
    );

    const renderDesktopBoard = () => (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 20 }}
                    >
                        {columnOrder.map((columnId, index) => (
                            <Column
                                key={columnId}
                                column={columns[columnId]}
                                tasks={buildColumnTasks(columnId)}
                                index={index}
                                onEditTask={handleEditTask}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );

    const openCreateModal = () => {
        setEditingTask(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    return (
        <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12}>
                    <Card size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#888' }}>今日任务完成度</span>
                                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: todayPercent === 100 ? '#3f8600' : undefined }}>
                                    {todayPercent}%
                                </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#888' }}>
                                {stats.today.done} / {stats.today.total} 已完成
                            </span>
                        </div>
                        <Progress percent={todayPercent} showInfo={false} strokeColor={todayPercent === 100 ? '#52c41a' : '#1890ff'} />
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#888' }}>普通任务完成度</span>
                                <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: generalPercent === 100 ? '#3f8600' : undefined }}>
                                    {generalPercent}%
                                </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#888' }}>
                                {stats.general.done} / {stats.general.total} 已完成
                            </span>
                        </div>
                        <Progress percent={generalPercent} showInfo={false} strokeColor={generalPercent === 100 ? '#52c41a' : '#1890ff'} />
                    </Card>
                </Col>
            </Row>

            <div
                style={{
                    marginBottom: 24,
                    display: 'flex',
                    justifyContent: isCompactLayout ? 'space-between' : 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                }}
            >
                {!isCompactLayout ? (
                    <Space wrap style={{ flex: 1 }}>
                        {renderFilterFields()}
                    </Space>
                ) : (
                    <div style={{ display: 'flex', flex: 1, gap: 12 }}>
                        {/* 竖屏端使用按钮样式的输入框来唤起筛选抽屉 */}
                        <button
                            type="button"
                            onClick={() => setIsFilterDrawerOpen(true)}
                            style={{
                                flex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                border: '1px solid var(--ant-color-border)',
                                borderRadius: 8,
                                padding: '0 12px',
                                height: 40,
                                background: 'transparent',
                                color: 'inherit'
                            }}
                        >
                            <SearchOutlined />
                            <span style={{ flex: 1, textAlign: 'left', opacity: 0.8 }}>
                                {filters.search || filters.priority.length || filters.category !== 'all' ? '已启用筛选' : '搜索 / 筛选'}
                            </span>
                        </button>
                        <Button type="primary" icon={<PlusOutlined />} style={{ flex: 1, height: 39, }} onClick={openCreateModal}>
                            新建任务
                        </Button>
                    </div>
                )}
                {!isCompactLayout && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        新建任务
                    </Button>
                )}
            </div>

            {isCompactLayout && (
                <Drawer
                    title="筛选任务"
                    placement="right"
                    open={isFilterDrawerOpen}
                    onClose={() => setIsFilterDrawerOpen(false)}
                >
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {renderFilterFields(true, { onSearchFinished: () => setIsFilterDrawerOpen(false) })}
                    </Space>
                </Drawer>
            )}

            {isCompactLayout ? renderCompactBoard(isMobileWidth ? 1 : 2) : renderDesktopBoard()}

            <Modal
                title={editingTask ? '编辑任务' : '新建任务'}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingTask(null);
                    form.resetFields();
                }}
                okText="确定"
                cancelText="取消"
            >
                <Form
                    form={form}
                    onFinish={handleFormSubmit}
                    layout="vertical"
                    initialValues={{ priority: 'medium', category: 'general' }}
                >
                    <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input.TextArea />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="priority" label="优先级">
                                <Select>
                                    <Select.Option value="high">高</Select.Option>
                                    <Select.Option value="medium">中</Select.Option>
                                    <Select.Option value="low">低</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="category" label="分类">
                                <Select>
                                    <Select.Option value="today">今日任务</Select.Option>
                                    <Select.Option value="general">普通任务</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="tags" label="标签">
                        <Select mode="tags" placeholder="输入标签后回车" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
