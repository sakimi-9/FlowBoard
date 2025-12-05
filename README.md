# FlowBoard – 智能任务看板

一个具备时间感知、多维过滤、日历快览、拖拽交互与主题切换等能力的现代化任务管理看板应用。

## 🚀 功能特性

- **智能时间感知**：自动识别逾期任务，完成超过 24h 的任务自动归档。
- **任务统计**：实时展示今日任务与总体任务的完成进度。
- **任务分类**：支持“今日任务”与“普通任务”分类，并提供专属日历视图。
- **多维过滤**：支持关键词、标签、优先级、任务分类组合筛选。
- **流畅拖拽**：基于 `@hello-pangea/dnd` 实现的任务与列拖拽。
- **主题切换**：支持亮色/暗黑模式，自动持久化偏好。
- **数据持久化**：所有数据保存在 LocalStorage，离线可用。
- **回收站机制**：支持软删除与彻底删除，防止误操作。
- **多端适配**：采用响应式设计，针对桌面端/平板横屏与手机/平板竖屏自适应布局，如移动端：列折叠与卡片左右滑分类等，单手即可完成全部操作。
- **日历快览**：日期单元仅用微型进度条呈现完成占比，点击后可查看详细任务列表，视觉更轻量；桌面与横屏平板仍保留任务标题列表，方便快速浏览。

## 💾 导入导出

- **JSON 导出/导入**：包含全部字段（任务、列、排序、过滤器、主题等），用于完整备份与恢复。
- **Markdown 导出/导入**：导出时提供可阅读摘要，并在文档内嵌 `json` 代码块保存完整数据；导入时自动解析该数据块，与 JSON 行为一致且不重置看板结构。如缺少数据块会退回旧版兼容模式，仅导入任务。

## 🛠️ 技术栈

- **核心框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand (with persist middleware)
- **UI 组件库**: Ant Design v5
- **拖拽库**: @hello-pangea/dnd
- **日期处理**: date-fns, dayjs
- **路由**: React Router v6

## 📦 安装与运行

1. **安装依赖**
```bash
  pnpm install
```

2. **启动开发服务器**
```bash
  pnpm run dev
```

3. **构建生产版本**
```bash
  pnpm run build
```

## 📂 项目结构

```
flow-board/
├── docs/                  # 项目说明、变更记录等
├── public/                # Vite 预处理的静态资源
├── src/
│   ├── assets/            # 图片、图标等静态素材
│   ├── components/        # 子组件: Layout.tsx, Column.tsx, TaskCard.tsx, ThemeProvider.tsx
│   ├── hooks/             # 自定义 Hook（usePortraitMode.ts 等）
│   ├── pages/             # 页面路由组件：Board.tsx, Archive.tsx, RecycleBin.tsx, Calendar.tsx
│   ├── store/             # Zustand 状态逻辑 (useTaskStore.ts 提供持久化、导入/导出、任务操作)
│   ├── types/             # 全局类型契约（Task、Column、ColumnId、FilterState、ThemePreference 等）
│   ├── index.css          # 全局样式定义
│   ├── App.tsx            # 路由与根组件
│   ├── main.tsx           # React 挂载点，提供主题与路由
│   └── vite.config.ts     # Vite 构建配置
├── package.json           # 脚本、依赖与工程元信息
├── pnpm-lock.yaml         # pnpm 依赖锁
└── README.md              # 当前说明文档
```

### 目录职责说明

- `components/`：保持展示层逻辑，避免直接调用 Zustand；所有事件通过 props 抽象到 `store/useTaskStore.ts`。
- `pages/`：组合各列/卡片组件，负责视图组织与路由参数（如归档或回收站切换）。
- `store/useTaskStore.ts`：集中处理任务 CRUD、栏目拖拽、导入/导出、回收站与批量操作，已通过 `zustand` 持久化到 `localStorage`。
- `types/index.ts`：定义 `Task`、`Column` 等结构，避免组件间使用 `any`。
- `hooks/`：比如 `usePortraitMode.ts`，封装媒体查询逻辑供导航、布局组件复用。
- `docs/` 与 `public/`：分别用于项目文档以及无需编译的静态资源。
