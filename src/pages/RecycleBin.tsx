import React from 'react';
import { Table, Button, Typography, Popconfirm, Space, Select } from 'antd';
import { useTaskStore } from '@/store/useTaskStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { UndoOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import type { Task } from '@/types';
import type { ColumnsType } from 'antd/es/table';

export const RecycleBin: React.FC = () => {
    const { tasks, restoreTask, permanentlyDeleteTask } = useTaskStore();
    const [categoryFilter, setCategoryFilter] = React.useState<'today' | 'general' | 'all'>('all');

    const deletedTasks = Object.values(tasks).filter(t => {
        if (t.status !== 'deleted') return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        return true;
    });

    const handleEmptyRecycleBin = () => {
        deletedTasks.forEach(task => permanentlyDeleteTask(task.id));
    };

    const columns: ColumnsType<Task> = [
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => <Typography.Text>{text}</Typography.Text>,
        },
        {
            title: '删除时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (date: number) => format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN }),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record) => (
                <Space>
                    <Button type="link" icon={<UndoOutlined />} onClick={() => restoreTask(record.id)}>
                        恢复
                    </Button>
                    <Popconfirm
                        title="彻底删除"
                        description="此操作不可逆，确定要彻底删除吗？"
                        onConfirm={() => permanentlyDeleteTask(record.id)}
                        okText="是"
                        cancelText="否"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            彻底删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Typography.Title level={2} style={{ margin: 0 }}>回收站</Typography.Title>
                <div style={{ display: 'flex', gap: '16px' }}>
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
                    {deletedTasks.length > 0 && (
                        <Popconfirm
                            title="清空回收站"
                            description="确定要清空所有已删除的任务吗？此操作不可逆。"
                            onConfirm={handleEmptyRecycleBin}
                            okText="是"
                            cancelText="否"
                        >
                            <Button danger icon={<ClearOutlined />}>清空回收站</Button>
                        </Popconfirm>
                    )}
                </div>
            </div>

            <Table
                dataSource={deletedTasks}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
};
