# 🦞 OC Cargo Claw

> 重构工业协同：当 3D 数字孪生遇上多智能体社会的智慧港口解决方案

## 🏗️ 项目架构

```
cargo-claw/
├── frontend/                  # React + TypeScript + Three.js
│   ├── src/
│   │   ├── core/
│   │   │   ├── engine/        # SceneManager — Three.js 生命周期管理
│   │   │   ├── agents/        # OC Agent 逻辑（TODO）
│   │   │   └── utils/         # 工具函数
│   │   ├── scenes/
│   │   │   ├── port/          # L1 全港鸟瞰场景
│   │   │   ├── yard/          # L2 堆场街景（TODO）
│   │   │   └── container/     # L3 单箱装载（TODO: 迁移 SmartContainer）
│   │   ├── components/
│   │   │   ├── ui/            # TopBar, buttons, modals
│   │   │   ├── panels/        # AgentPanel, DataPanel
│   │   │   └── hud/           # MetricsHUD, overlays
│   │   ├── stores/            # Zustand 全局状态
│   │   ├── hooks/             # React hooks
│   │   ├── types/             # TypeScript 类型定义
│   │   └── styles/            # 全局 CSS + 设计系统
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                   # NestJS API（Phase 3）
├── docker-compose.yml
└── README.md
```

## 🚀 快速开始

### 本地开发

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`

### Docker 部署

```bash
docker compose up --build
```

访问 `http://localhost:3000`

### 云服务器部署

```bash
# 1. 在服务器上 clone 代码
git clone <your-repo-url>
cd cargo-claw

# 2. 构建并启动
docker compose up -d --build

# 3. 配置 Nginx 反向代理（可选，用于域名+HTTPS）
# 参见下方「生产部署」章节
```

## 🎮 操作指南

- **左键拖拽** — 旋转视角
- **滚轮** — 缩放
- **点击堆场** — 下钻到堆区视图（L2，开发中）
- **右侧面板** — 查看 OC Agent 实时状态
- **PAUSE/RESUME** — 暂停/恢复仿真

## 🤖 OC Agent 系统

| Agent | 角色 | 职责 |
|-------|------|------|
| 📋 箱单 OC | Data Agent | 订单数据清洗与标准化 |
| 🦞 堆叠 OC | Lobster Agent | 空间推演与装载优化 |
| 🛡️ 安全 OC | Safety Agent | 三维重心校验与合规审查 |
| 🎯 调度 OC | Dispatch Agent | 设备协调与任务分配 |
| ⚡ 指令 OC | Execution Agent | 生成机器可读指令集 |

## 📋 开发路线

- [x] 项目骨架搭建（Vite + React + TS + Three.js）
- [x] 全局状态管理（Zustand）
- [x] SceneManager 引擎（相机控制、动画系统、点击检测）
- [x] L1 全港 3D 场景（海面、地面、船舶、岸桥、堆场、AGV）
- [x] OC Agent 可视化标识
- [x] 右侧 Agent 状态面板
- [x] HUD 效能指标面板
- [x] 仿真模拟引擎
- [x] Docker 部署配置
- [ ] L2 堆场下钻场景
- [ ] L3 单箱装载场景（迁移 SmartContainer）
- [ ] 安全 OC — CoG 重心计算引擎
- [ ] NestJS 后端 API
- [ ] 数据库 schema（PostgreSQL）
- [ ] 用户认证系统
- [ ] BAPLIE 箱单格式解析
- [ ] LLM 自然语言查询接口

## 🔧 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| 3D 引擎 | Three.js (原生) |
| 状态管理 | Zustand |
| 样式 | CSS Modules |
| 容器化 | Docker + Nginx |
| 后端（计划） | NestJS + PostgreSQL + Redis |

## 📄 License

MIT
