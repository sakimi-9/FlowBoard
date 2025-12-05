import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, theme, Upload, message, Modal, Dropdown, Radio, Grid } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SunOutlined, MoonOutlined, AppstoreOutlined, InboxOutlined, DeleteOutlined, CalendarOutlined, DownloadOutlined, UploadOutlined, MoreOutlined, FileTextOutlined, CodeOutlined } from '@ant-design/icons';
import { useTaskStore } from '@/store/useTaskStore';
import type { MenuProps } from 'antd';
import type { Task, Column, ColumnId, FilterState, ThemePreference } from '@/types';
import { usePortraitMode } from '@/hooks/usePortraitMode';

const { Header, Content } = AntLayout;
const { useBreakpoint } = Grid;

type ExportData = {
    tasks: Record<string, Task>;
    columns: Record<ColumnId, Column>;
    columnOrder: ColumnId[];
    filters: FilterState;
    theme: ThemePreference;
    version?: string;
    exportedAt?: number;
};

const NAV_LINKS = [
    { key: '/', label: '看板', icon: <AppstoreOutlined /> },
    { key: '/calendar', label: '日历', icon: <CalendarOutlined /> },
    { key: '/archive', label: '归档', icon: <InboxOutlined /> },
    { key: '/recycle-bin', label: '回收站', icon: <DeleteOutlined /> },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme: appTheme, toggleTheme, importData } = useTaskStore();
    const location = useLocation();
    const navigate = useNavigate();
    const {
        token: { colorBgContainer, colorBorderSecondary },
    } = theme.useToken();
    const screens = useBreakpoint();
    const isPortrait = usePortraitMode();
    const isMobileWidth = !screens.sm;
    const isTabletPortrait = screens.md && !screens.lg && isPortrait;
    const showCompactNav = isMobileWidth || isTabletPortrait;
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'json' | 'md'>('json');
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    const handleExport = () => {
        const state = useTaskStore.getState();

        // 构建完整数据，便于 JSON 与 Markdown 共用
        const buildExportData = (): ExportData => ({
            tasks: state.tasks,
            columns: state.columns,
            columnOrder: state.columnOrder,
            filters: state.filters,
            theme: state.theme,
            version: '1.1.0',
            exportedAt: Date.now(),
        });

        if (exportFormat === 'json') {
            const data = buildExportData();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flowboard-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            const exportData = buildExportData();
            const readableDate = new Date(exportData.exportedAt ?? Date.now()).toLocaleString();
            const taskCount = Object.keys(exportData.tasks).length;
            const columnCount = exportData.columnOrder.length;

            // Markdown 中附带 JSON 数据块，既可阅读也可直接导入
            let mdContent = `# FlowBoard Markdown 导出\n\n`;
            mdContent += `- 导出时间: ${readableDate}\n`;
            mdContent += `- 格式版本: ${exportData.version}\n`;
            mdContent += `- 任务总数: ${taskCount}\n`;
            mdContent += `- 列数量: ${columnCount}\n\n`;

            mdContent += `## 看板结构\n`;
            exportData.columnOrder.forEach((colId, index) => {
                const column = exportData.columns[colId];
                if (!column) return;
                mdContent += `${index + 1}. ${column.title} (${colId}) - 任务数: ${column.taskIds.length}\n`;
            });

            mdContent += `\n## 任务列表（按列）\n`;
            exportData.columnOrder.forEach((colId) => {
                const column = exportData.columns[colId];
                if (!column) return;
                mdContent += `\n### ${column.title} (${colId})\n`;
                if (!column.taskIds.length) {
                    mdContent += '- （空）\n';
                    return;
                }
                column.taskIds.forEach((taskId) => {
                    const task = exportData.tasks[taskId];
                    if (!task) return;
                    const statusMark = task.status === 'done' ? '[x]' : '[ ]';
                    const tagText = task.tags?.length ? ` | 标签: ${task.tags.join(', ')}` : '';
                    const descText = task.description ? `\n  描述: ${task.description.replace(/\n/g, ' ')}` : '';
                    mdContent += `- ${statusMark} ${task.title}（优先级: ${task.priority}，分类: ${task.category}${tagText}）${descText}\n`;
                });
            });

            mdContent += `\n## 数据(JSON，可直接导入)\n`;
            mdContent += '```json\n';
            mdContent += JSON.stringify(exportData, null, 2);
            mdContent += '\n```\n';

            const blob = new Blob([mdContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flowboard-backup-${new Date().toISOString().split('T')[0]}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        message.success('导出成功');
        setIsExportModalOpen(false);
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                let data: ExportData;

                // 统一规范数据，缺失字段提供默认值
                const normalizeExportData = (raw: Partial<ExportData>): ExportData => {
                    const tasks = (raw.tasks ?? {}) as Record<string, Task>;
                    const columns = (raw.columns ?? {}) as Record<ColumnId, Column>;
                    const columnOrder = Array.isArray(raw.columnOrder) && raw.columnOrder.length
                        ? (raw.columnOrder as ColumnId[]).filter((id) => Boolean(columns[id]))
                        : (Object.keys(columns) as ColumnId[]);

                    const sanitizedColumns = Object.entries(columns).reduce((acc, [colId, col]) => {
                        const normalizedColumn = (col ?? { id: colId as ColumnId, title: colId, taskIds: [] }) as Column;
                        const validTaskIds = (normalizedColumn.taskIds ?? []).filter((taskId: string) => Boolean(tasks[taskId]));
                        acc[colId as ColumnId] = { ...normalizedColumn, taskIds: validTaskIds } as Column;
                        return acc;
                    }, {} as Record<ColumnId, Column>);

                    return {
                        tasks,
                        columns: sanitizedColumns,
                        columnOrder,
                        filters: raw.filters ?? { search: '', tags: [], priority: [], category: 'all' },
                        theme: raw.theme ?? { mode: 'light' },
                        version: raw.version ?? '1.1.0',
                        exportedAt: raw.exportedAt ?? Date.now(),
                    };
                };

                // 解析新版 Markdown（包含 JSON 数据块）
                const parseMarkdownExport = (markdown: string): ExportData | null => {
                    const jsonBlockMatch = markdown.match(/```json\s*([\s\S]*?)\s*```/i);
                    if (!jsonBlockMatch) return null;
                    const jsonText = jsonBlockMatch[1];
                    return normalizeExportData(JSON.parse(jsonText));
                };

                if (file.name.endsWith('.json')) {
                    data = normalizeExportData(JSON.parse(content));
                } else if (file.name.endsWith('.md')) {
                    const parsed = parseMarkdownExport(content);
                    if (parsed) {
                        data = parsed;
                    } else {
                        message.warning('未找到 JSON 数据块，将按旧版 Markdown 仅导入任务，可能无法完整恢复看板结构');
                        const tasks: Record<string, Task> = {};
                        const lines = content.split('\n');
                        type ImportTask = {
                            id: string;
                            title: string;
                            status: Task['status'];
                            tags: string[];
                            priority: Task['priority'];
                            category: Task['category'];
                            createdAt: number;
                            updatedAt: number;
                            isArchived: boolean;
                            description?: string;
                            completedAt?: number;
                        };
                        let currentTask: ImportTask | undefined;

                        const parseStatus = (value: string): Task['status'] => (
                            value === 'done' || value === 'in-progress' || value === 'todo' || value === 'deleted'
                                ? value
                                : 'todo'
                        );
                        const parsePriority = (value: string): Task['priority'] => (
                            value === 'high' || value === 'medium' || value === 'low' ? value : 'medium'
                        );
                        const parseCategory = (value: string): Task['category'] => (
                            value === 'today' ? 'today' : 'general'
                        );

                        lines.forEach(line => {
                            if (line.startsWith('### [')) {
                                if (currentTask) {
                                    tasks[currentTask.id] = currentTask;
                                }
                                const isDone = line.includes('[x]');
                                const title = line.replace(/^### \[[ x]\] /, '').trim();
                                currentTask = {
                                    id: crypto.randomUUID(),
                                    title,
                                    status: isDone ? 'done' : 'todo',
                                    tags: [],
                                    priority: 'medium',
                                    category: 'general',
                                    createdAt: Date.now(),
                                    updatedAt: Date.now(),
                                    isArchived: false,
                                };
                            } else if (currentTask) {
                                if (line.trim().startsWith('- ID: ')) currentTask.id = line.trim().replace('- ID: ', '');
                                else if (line.trim().startsWith('- Status: ')) currentTask.status = parseStatus(line.trim().replace('- Status: ', ''));
                                else if (line.trim().startsWith('- Priority: ')) currentTask.priority = parsePriority(line.trim().replace('- Priority: ', ''));
                                else if (line.trim().startsWith('- Category: ')) currentTask.category = parseCategory(line.trim().replace('- Category: ', ''));
                                else if (line.trim().startsWith('- Tags: ')) currentTask.tags = line.trim().replace('- Tags: ', '').split(', ');
                                else if (line.trim() === '---') {
                                    tasks[currentTask.id] = currentTask as Task;
                                    currentTask = undefined;
                                } else if (line.trim() !== '' && !line.trim().startsWith('- Created:')) {
                                    currentTask.description = (currentTask.description || '') + line + '\n';
                                }
                            }
                        });
                        if (currentTask) {
                            tasks[currentTask.id] = currentTask as Task;
                        }

                        data = normalizeExportData({
                            tasks,
                            columns: {
                                'todo': { id: 'todo', title: '待办', taskIds: [] },
                                'in-progress': { id: 'in-progress', title: '进行中', taskIds: [] },
                                'done': { id: 'done', title: '已完成', taskIds: [] },
                            },
                            columnOrder: ['todo', 'in-progress', 'done'],
                            filters: { search: '', tags: [], priority: [], category: 'all' },
                            theme: { mode: 'light' }
                        });

                        Object.values(tasks).forEach((task) => {
                            const target: ColumnId = task.status === 'todo' || task.status === 'in-progress' || task.status === 'done'
                                ? task.status
                                : 'todo';
                            data.columns[target].taskIds.push(task.id);
                        });
                    }
                } else {
                    throw new Error('Unsupported file format');
                }

                Modal.confirm({
                    title: '确认导入',
                    content: '导入将覆盖当前所有数据，确定要继续吗？',
                    okText: '确认覆盖',
                    cancelText: '取消',
                    onOk: () => {
                        importData(data);
                        message.success('导入成功');
                    },
                });
            } catch (error) {
                console.error(error);
                message.error('文件解析失败');
            }
        };
        reader.readAsText(file);
        return false;
    };

    const menuItems = NAV_LINKS.map((link) => ({
        key: link.key,
        icon: link.icon,
        label: <Link to={link.key}>{link.label}</Link>,
    }));

    const closeMoreMenu = () => setMoreMenuOpen(false);

    const moreMenuProps: MenuProps = {
        items: [
            {
                key: 'import',
                label: (
                    <Upload beforeUpload={handleImport} showUploadList={false} accept=".json,.md">
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            onClick={closeMoreMenu}
                        >
                            <DownloadOutlined /> 导入数据
                        </div>
                    </Upload>
                ),
            },
            {
                key: 'export',
                label: (
                    <div
                        onClick={() => {
                            setIsExportModalOpen(true);
                            closeMoreMenu();
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <UploadOutlined />导出数据
                    </div>
                ),
            },
            { type: 'divider' },
            {
                key: 'theme',
                label: (
                    <div
                        onClick={() => {
                            toggleTheme();
                            closeMoreMenu();
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        {appTheme.mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                        {appTheme.mode === 'dark' ? '切换亮色' : '切换暗色'}
                    </div>
                ),
            },
        ],
    };

    const renderBottomNav = () => {
        if (!showCompactNav) return null;
        const isDark = appTheme.mode === 'dark';
        const baseColor = isDark ? '#f5f5f5' : '#444';
        const containerBg = isDark ? '#111' : colorBgContainer;

        return (
            <div
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'space-around',
                    borderTop: `1px solid ${colorBorderSecondary}`,
                    background: containerBg,
                    zIndex: 800,
                    padding: '8px 0',
                }}
            >
                {NAV_LINKS.map((link) => {
                    const isActive = location.pathname === link.key;
                    const itemColor = isActive ? '#1677ff' : baseColor;
                    return (
                        <button
                            key={link.key}
                            type="button"
                            onClick={() => navigate(link.key)}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                                color: itemColor,
                                fontSize: 12,
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ fontSize: 18, color: itemColor }}>
                                {link.icon}
                            </span>
                            <span style={{ lineHeight: 1 }}>{link.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    background: colorBgContainer,
                    borderBottom: `1px solid ${colorBorderSecondary}`,
                    position: showCompactNav ? 'sticky' : 'static',
                    top: 0,
                    zIndex: 900,
                }}
            >
                <div
                    style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        marginRight: showCompactNav ? 'auto' : '40px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <span style={{ marginRight: '8px' }}>🌊</span> FlowBoard
                </div>
                {!showCompactNav && (
                    <Menu
                        mode="horizontal"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{ flex: 1, borderBottom: 'none', background: 'transparent' }}
                    />
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: showCompactNav ? 'auto' : undefined }}>
                    <Dropdown
                        menu={moreMenuProps}
                        placement="bottomRight"
                        arrow
                        trigger={['click']}
                        open={moreMenuOpen}
                        onOpenChange={setMoreMenuOpen}
                    >
                        <Button
                            type="text"
                            icon={<MoreOutlined style={{ fontSize: '16px' }} />}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '0 8px',
                                height: '32px',
                                fontSize: '14px',
                            }}
                        >
                            更多
                        </Button>
                    </Dropdown>
                </div>
            </Header>
            <Content
                style={{
                    padding: '24px',
                    paddingBottom: showCompactNav ? 120 : 24,
                    maxWidth: '1400px',
                    margin: '0 auto',
                    width: '100%'
                }}
            >
                {children}
            </Content>

            {renderBottomNav()}

            <Modal
                title="导出数据"
                open={isExportModalOpen}
                onOk={handleExport}
                onCancel={() => setIsExportModalOpen(false)}
                okText="导出"
                cancelText="取消"
            >
                <div style={{ marginBottom: 16 }}>请选择导出格式：</div>
                <Radio.Group onChange={(e) => setExportFormat(e.target.value)} value={exportFormat}>
                    <Radio value="json"><CodeOutlined /> JSON 格式 (完整备份)</Radio>
                    <Radio value="md"><FileTextOutlined /> Markdown 格式 (易读文本)</Radio>
                </Radio.Group>
                <div style={{ marginTop: 16, fontSize: '12px', color: '#888' }}>
                    {exportFormat === 'json' ? 'JSON 格式包含所有应用数据，适合完整备份和恢复，可读性欠缺。' : 'Markdown 格式包含任务列表，适合阅读和分享，小白推荐。'}
                </div>
            </Modal>
        </AntLayout>
    );
};
