import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Grid, theme, Button } from 'antd';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { TaskCard } from './TaskCard';
import type { Column as ColumnType, Task } from '@/types';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    index: number;
    onEditTask: (task: Task) => void;
    isDragEnabled?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: (columnId: ColumnType['id']) => void;
    onTaskSwipe?: (task: Task, direction: 'left' | 'right') => void;
}

const { useBreakpoint } = Grid;

export const Column: React.FC<ColumnProps> = ({
    column,
    tasks,
    index,
    onEditTask,
    isDragEnabled = true,
    isCollapsed = false,
    onToggleCollapse,
    onTaskSwipe,
}) => {
    const {
        token: { colorBgLayout, colorBgContainer, colorPrimaryBg },
    } = theme.useToken();
    const screens = useBreakpoint();
    const showCollapseControl = !isDragEnabled && Boolean(onToggleCollapse);
    const shouldHideTasks = showCollapseControl && isCollapsed;

    const getResponsiveWidth = () => {
        if (!isDragEnabled) return undefined;
        if (screens.xxl) return 360;
        if (screens.xl) return 320;
        if (screens.lg) return 280;
        if (screens.md) return 260;
        return 240;
    };

    const columnWidth = getResponsiveWidth();
    const computedWidth = columnWidth ? `${columnWidth}px` : '100%';

    const ColumnContent = (
        <div
            style={{
                width: computedWidth,
                flex: columnWidth ? `0 0 ${computedWidth}` : '1 1 100%',
                minWidth: columnWidth ? '240px' : '100%',
                maxWidth: columnWidth ? computedWidth : '100%',
                display: 'flex',
                flexDirection: 'column',
                marginRight: isDragEnabled ? '16px' : 0,
                height: '100%',
            }}
        >
            <div
                style={{
                    padding: '12px 16px',
                    background: colorBgContainer,
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                    borderBottomLeftRadius: shouldHideTasks ? '8px' : 0,
                    borderBottomRightRadius: shouldHideTasks ? '8px' : 0,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: shouldHideTasks ? 'none' : `1px solid ${colorBgLayout}`,
                }}
            >
                <span style={{ flex: 1 }}>{column.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                        style={{
                            background: colorBgLayout,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: '#666',
                        }}
                    >
                        {tasks.length}
                    </span>
                    {showCollapseControl && (
                        <Button
                            type="text"
                            size="small"
                            icon={shouldHideTasks ? <PlusSquareOutlined /> : <MinusSquareOutlined />}
                            onClick={() => onToggleCollapse && onToggleCollapse(column.id)}
                        />
                    )}
                </div>
            </div>

            {isDragEnabled ? (
                <Droppable droppableId={column.id} type="task">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                                padding: '8px',
                                background: snapshot.isDraggingOver ? colorPrimaryBg : colorBgLayout,
                                flexGrow: 1,
                                minHeight: '100px',
                                borderBottomLeftRadius: '8px',
                                borderBottomRightRadius: '8px',
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            {tasks.map((task, index) => (
                                <TaskCard key={task.id} task={task} index={index} onEdit={onEditTask} isDragEnabled={true} />
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            ) : (
                !shouldHideTasks && (
                    <div
                        style={{
                            padding: '8px',
                            background: colorBgLayout,
                            flexGrow: 1,
                            minHeight: tasks.length > 0 ? '100px' : 0,
                            borderBottomLeftRadius: '8px',
                            borderBottomRightRadius: '8px',
                        }}
                    >
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                index={index}
                                onEdit={onEditTask}
                                isDragEnabled={false}
                                onSwipe={onTaskSwipe ? (direction) => onTaskSwipe(task, direction) : undefined}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );

    if (!isDragEnabled) {
        return ColumnContent;
    }

    return (
        <Draggable draggableId={column.id} index={index}>
            {(provided) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                        ...provided.draggableProps.style,
                        outline: 'none',
                    }}
                >
                    <div {...provided.dragHandleProps}>
                        {ColumnContent}
                    </div>
                </div>
            )}
        </Draggable>
    );
};
