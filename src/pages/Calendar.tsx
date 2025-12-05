import React, { useState } from 'react';
import { Calendar, Modal, Tag, Select, Grid, Badge } from 'antd';
import type { Dayjs } from 'dayjs';
import { useTaskStore } from '@/store/useTaskStore';
import dayjs from 'dayjs';
import { usePortraitMode } from '@/hooks/usePortraitMode';
const { useBreakpoint } = Grid;

const priorityBadgeColors: Record<string, string> = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a',
};

export const CalendarPage: React.FC = () => {
    const { tasks, theme: appTheme } = useTaskStore();
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'today' | 'general'>('all');
    const screens = useBreakpoint();
    const isPortraitMode = usePortraitMode();
    const isMobileWidth = !screens.sm;
    const isTabletPortrait = screens.md && !screens.lg && isPortraitMode;
    // 仅在竖屏手机/平板时启用小横条视图
    const useCompactCells = isPortraitMode && (isMobileWidth || isTabletPortrait);
    const desktopTaskViewportHeight = 72; // 桌面端任务框高度（仅露出约 3 条，数值可手动调整）
    const desktopTaskBoxWidth = '90%'; // 桌面端任务框宽度（留出白边，方便后续修改）
    const compactCellMinHeight = 52; // 竖屏小格子最小高度，减小下方留白

    const getListData = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        const listData: { content: string; status: string; priority: string; category: string; badgeColor: string }[] = [];

        Object.values(tasks).forEach(task => {
            if (task.status === 'deleted' || task.isArchived) return;
            if (categoryFilter !== 'all' && task.category !== categoryFilter) return;

            const taskDate = dayjs(task.createdAt).format('YYYY-MM-DD');

            if (taskDate === dateStr) {
                listData.push({
                    content: task.title,
                    status: task.status,
                    priority: task.priority,
                    category: task.category,
                    badgeColor: priorityBadgeColors[task.priority] || '#1890ff'
                });
            }
        });
        return listData;
    };

    const getCompletionPercentage = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        let total = 0;
        let done = 0;

        Object.values(tasks).forEach(task => {
            if (task.status === 'deleted' || task.isArchived) return;
            if (categoryFilter !== 'all' && task.category !== categoryFilter) return;

            const taskDate = dayjs(task.createdAt).format('YYYY-MM-DD');
            if (taskDate === dateStr) {
                total++;
                if (task.status === 'done') done++;
            }
        });

        return total === 0 ? 0 : (done / total) * 100;
    };

    const renderDateNumber = (value: Dayjs, extraStyle?: React.CSSProperties) => (
        <div
            className="flow-calendar-date-value"
            style={{
                fontWeight: 600,
                fontSize: 12,
                color: appTheme.mode === 'dark' ? '#f0f0f0' : '#1f1f1f',
                textAlign: 'left',
                ...extraStyle,
            }}
        >
            {value.date()}
        </div>
    );

    const dateFullCellRender = (current: Dayjs) => {
        const listData = getListData(current);
        const hasTasks = listData.length > 0;
        const percentage = getCompletionPercentage(current);
        const progressFill = appTheme.mode === 'dark' ? '#1b4026' : '#d9f7be';
        const progressRest = appTheme.mode === 'dark' ? '#0f0f0f' : '#ffffff';
        const gradientBg = `linear-gradient(to right, ${progressFill} ${percentage}%, ${progressRest} ${percentage}%)`;
        const cellBorderColor = appTheme.mode === 'dark' ? '#2b2b2b' : '#e3e6eb';
        const cellBgColor = appTheme.mode === 'dark' ? '#101010' : '#ffffff';
        const cardShadow = appTheme.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.35)' : '0 1px 3px rgba(15,23,42,0.08)';

        const wrapperStyle: React.CSSProperties = {
            border: `1px solid ${cellBorderColor}`,
            borderRadius: 12,
            background: cellBgColor,
            padding: '6px 8px',
            minHeight: 84,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxShadow: cardShadow,
        };

        if (useCompactCells) {
            const trackColor = appTheme.mode === 'dark' ? '#1f1f1f' : '#f0f0f0';
            const fillColor = appTheme.mode === 'dark' ? '#52c41a' : '#1890ff';

            return (
                <div style={{ ...wrapperStyle, minHeight: compactCellMinHeight, gap: 4 }}>
                    {renderDateNumber(current, { textAlign: 'center' })}
                    <div style={{ height: 4, borderRadius: 2, background: trackColor, overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: fillColor,
                                transition: 'width 0.3s ease',
                            }}
                        />
                    </div>
                </div>
            );
        }

        const boxBorderColor = appTheme.mode === 'dark' ? '#353535' : '#e4e7ec';
        const taskBoxBg = hasTasks ? gradientBg : appTheme.mode === 'dark' ? '#1a1a1a' : '#fafafa';
        const shouldScroll = hasTasks && listData.length > 3;

        return (
            <div style={wrapperStyle}>
                {renderDateNumber(current)}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div
                        className="flow-calendar-task-box"
                        style={{
                            borderRadius: 10,
                            border: `1px solid ${boxBorderColor}`,
                            padding: hasTasks ? '6px' : '6px',
                            background: taskBoxBg,
                            width: desktopTaskBoxWidth,
                            height: desktopTaskViewportHeight,
                            overflowY: shouldScroll ? 'auto' : 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                    >
                        {hasTasks ? (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
                                {listData.map((item, index) => (
                                    <li
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden',
                                            fontSize: 12,
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        <Badge color={item.badgeColor} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>{item.content}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    const onSelect = (newValue: Dayjs, info: { source: 'year' | 'month' | 'date' | 'customize' }) => {
        if (info.source === 'date') {
            setSelectedDate(newValue);
            setIsModalOpen(true);
        }
    };

    const selectedDateTasks = selectedDate ? getListData(selectedDate) : [];

    // Calculate stats for selected date
    const getStatsForDate = (date: Dayjs | null) => {
        if (!date) return { general: { done: 0, total: 0 }, today: { done: 0, total: 0 } };

        const dateStr = date.format('YYYY-MM-DD');
        const stats = {
            general: { done: 0, total: 0 },
            today: { done: 0, total: 0 }
        };

        Object.values(tasks).forEach(task => {
            if (task.status === 'deleted' || task.isArchived) return;
            const taskDate = dayjs(task.createdAt).format('YYYY-MM-DD');

            if (taskDate === dateStr) {
                const category = task.category === 'today' ? 'today' : 'general';
                stats[category].total++;
                if (task.status === 'done') {
                    stats[category].done++;
                }
            }
        });
        return stats;
    };

    const stats = getStatsForDate(selectedDate);

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
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
            <Calendar
                dateFullCellRender={dateFullCellRender}
                onSelect={onSelect}
                fullscreen={screens.md}
                mode="month"
                headerRender={({ value, onChange }) => {
                    const months = [];
                    for (let i = 0; i < 12; i++) {
                        months.push(value.month(i).format('MMM'));
                    }

                    return (
                        <div style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                {value.format('YYYY年 MM月')}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Select
                                    size="small"
                                    popupMatchSelectWidth={false}
                                    value={value.month()}
                                    onChange={(newMonth) => {
                                        const now = value.clone().month(newMonth);
                                        onChange(now);
                                    }}
                                >
                                    {months.map((month, index) => (
                                        <Select.Option key={index} value={index}>
                                            {month}
                                        </Select.Option>
                                    ))}
                                </Select>
                                <Select
                                    size="small"
                                    popupMatchSelectWidth={false}
                                    value={value.year()}
                                    onChange={(newYear) => {
                                        const now = value.clone().year(newYear);
                                        onChange(now);
                                    }}
                                >
                                    {Array.from({ length: 20 }, (_, i) => value.year() - 10 + i).map((year) => (
                                        <Select.Option key={year} value={year}>
                                            {year}年
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    );
                }}
            />
            <Modal
                title={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>{selectedDate?.format('YYYY-MM-DD')} 任务列表</span>
                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
                            任务完成情况: 普通 {stats.general.done}/{stats.general.total}  今日 {stats.today.done}/{stats.today.total}
                        </span>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedDateTasks.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '12px',
                                border: '1px solid #f0f0f0',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.content}</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Tag color={item.status === 'done' ? 'green' : 'blue'}>
                                        {item.status === 'done' ? '已完成' : '进行中/待办'}
                                    </Tag>
                                    <Tag>{item.category === 'today' ? '今日任务' : '普通任务'}</Tag>
                                </div>
                            </div>
                        </div>
                    ))}
                    {selectedDateTasks.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                            暂无任务
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
