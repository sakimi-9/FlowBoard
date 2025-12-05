import React from 'react';
import { Table, Button, Tag, Typography, Popconfirm, Select } from 'antd';
import { useTaskStore } from '@/store/useTaskStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { UndoOutlined } from '@ant-design/icons';
import type { Task } from '@/types';
import type { ColumnsType } from 'antd/es/table';

export const Archive: React.FC = () => {
    const { tasks, unarchiveTask } = useTaskStore();
    const [categoryFilter, setCategoryFilter] = React.useState<'today' | 'general' | 'all'>('all');

    const archivedTasks = Object.values(tasks).filter(t => {
        if (!t.isArchived) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        return true;
    });

    const columns: ColumnsType<Task> = [
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
        },
        {
            title: '完成时间',
            dataIndex: 'completedAt',
            key: 'completedAt',
            render: (date: number) => date ? format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '-',
        },
        {
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            render: (tags: string[]) => (
                <>
                    {tags.map(tag => (
                        <Tag key={tag}>#{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record) => (
                <Popconfirm
                    title="恢复任务"
                    description="确定要将此任务恢复到“已完成”列表吗？"
                    onConfirm={() => unarchiveTask(record.id)}
                    okText="是"
                    cancelText="否"
                >
                    <Button type="link" icon={<UndoOutlined />}>恢复</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <Typography.Title level={2} style={{ margin: 0 }}>归档任务</Typography.Title>
                    <Typography.Paragraph style={{ margin: 0 }}>
                    </Typography.Paragraph>
                </div>
                <Select
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    style={{ width: 120 }}
                    options={[
                        { label: '全部任务', value: 'all' },
                        { label: '今日任务', value: 'today' },
                        { label: '普通任务', value: 'general' },
                    ]}
                />
            </div>
            <Table
                dataSource={archivedTasks}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
};
