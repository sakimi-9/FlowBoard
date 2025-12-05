import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, Tag, Typography, Flex, Tooltip, Button, Popconfirm, Modal, Descriptions } from 'antd';
import { ClockCircleOutlined, FlagOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { Task } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTaskStore } from '@/store/useTaskStore';

interface TaskCardProps {
    task: Task;
    index: number;
    onEdit: (task: Task) => void;
    isDragEnabled?: boolean;
    onSwipe?: (direction: 'left' | 'right') => void;
}

const priorityColors = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onEdit, isDragEnabled = true, onSwipe }) => {
    const { deleteTask } = useTaskStore();
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchOffset, setTouchOffset] = useState(0);
    const [activeDirection, setActiveDirection] = useState<'left' | 'right' | null>(null);
    const [isSwiping, setIsSwiping] = useState(false);
    const swipeEnabled = !isDragEnabled && Boolean(onSwipe);

    const handleCardClick = () => {
        if (swipeEnabled && (isSwiping || touchStartX !== null)) {
            return;
        }
        setIsDetailOpen(true);
    };

    const handleTouchStart = (event: React.TouchEvent) => {
        if (!swipeEnabled) return;
        setTouchStartX(event.touches[0].clientX);
        setIsSwiping(false);
    };

    const handleTouchMove = (event: React.TouchEvent) => {
        if (!swipeEnabled || touchStartX === null) return;
        const currentX = event.touches[0].clientX;
        const delta = currentX - touchStartX;
        setTouchOffset(delta);
        if (Math.abs(delta) > 15) {
            setIsSwiping(true);
        }
        if (Math.abs(delta) > 20) {
            setActiveDirection(delta > 0 ? 'right' : 'left');
        } else {
            setActiveDirection(null);
        }
    };

    const resetSwipe = () => {
        setTouchStartX(null);
        setTouchOffset(0);
        setActiveDirection(null);
        setIsSwiping(false);
    };

    const handleTouchEnd = () => {
        if (!swipeEnabled) return;
        if (activeDirection && Math.abs(touchOffset) > 60 && onSwipe) {
            onSwipe(activeDirection);
        }
        resetSwipe();
    };

    const CardContent = (
        <Card
            size="small"
            hoverable
            onClick={handleCardClick}
            style={{
                opacity: task.status === 'done' ? 0.6 : 1,
                cursor: isDragEnabled ? 'grab' : 'pointer',
                marginBottom: isDragEnabled ? 0 : '8px',
                width: '100%',
                position: 'relative',
                transform: swipeEnabled ? `translateX(${touchOffset}px)` : undefined,
                transition: swipeEnabled ? (touchStartX === null ? 'transform 0.2s ease' : 'none') : undefined,
            }}
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Typography.Text strong ellipsis style={{ flex: 1, minWidth: 0 }}>
                        {task.title}
                    </Typography.Text>
                </div>
            }
            extra={
                <Flex gap={0} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={`优先级: ${task.priority}`}>
                        <FlagOutlined style={{ color: priorityColors[task.priority], marginRight: 8 }} />
                    </Tooltip>
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(task)}
                    />
                    <Popconfirm title="移至回收站?" onConfirm={() => deleteTask(task.id)} okText="是" cancelText="否">
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Flex>
            }
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <Flex vertical gap={4} style={{ width: '100%' }}>
                {task.description && (
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }} ellipsis>
                        {task.description}
                    </Typography.Text>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {task.tags.map(tag => (
                        <Tag key={tag} style={{ fontSize: '10px', margin: 0 }}>#{tag}</Tag>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                        {formatDistanceToNow(task.createdAt, { addSuffix: true, locale: zhCN })}
                    </div>
                    <Tooltip title={task.category === 'today' ? '今日任务' : '普通任务'}>
                        {task.category === 'today' ? <CalendarOutlined style={{ color: '#1890ff' }} /> : <AppstoreOutlined />}
                    </Tooltip>
                </div>
            </Flex>
        </Card>
    );

    return (
        <>
            {isDragEnabled ? (
                <Draggable draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                                ...provided.draggableProps.style,
                                marginBottom: '8px',
                            }}
                        >
                            {React.cloneElement(CardContent, {
                                style: {
                                    ...CardContent.props.style,
                                    boxShadow: snapshot.isDragging ? '0 5px 10px rgba(0,0,0,0.15)' : undefined,
                                }
                            })}
                        </div>
                    )}
                </Draggable>
            ) : (
                <div style={{ marginBottom: '8px' }}>
                    {CardContent}
                </div>
            )}

            <Modal
                title="任务详情"
                open={isDetailOpen}
                onCancel={() => setIsDetailOpen(false)}
                footer={[
                ]}
            >
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="标题">{task.title}</Descriptions.Item>
                    <Descriptions.Item label="描述" contentStyle={{ whiteSpace: 'pre-wrap' }}>{task.description || '无'}</Descriptions.Item>
                    <Descriptions.Item label="优先级">
                        <Tag color={priorityColors[task.priority]}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="分类">
                        {task.category === 'today' ? <Tag color="blue">今日任务</Tag> : <Tag>普通任务</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                        {task.status === 'todo' ? '待办' : task.status === 'in-progress' ? '进行中' : '已完成'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                        {format(task.createdAt, 'yyyy-MM-dd HH:mm:ss')}
                    </Descriptions.Item>
                    {task.tags.length > 0 && (
                        <Descriptions.Item label="标签">
                            {task.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Modal>
        </>
    );
};

