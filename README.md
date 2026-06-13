# 🛰️ 第六师兵团库房管理系统 (label-2898)

![Django](https://img.shields.io/badge/Django-4.2.7-092e20?style=for-the-badge&logo=django)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql)
![Bootstrap Icons](https://img.shields.io/badge/UI-Sci--Fi_Futuristic-00d2ff?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ed?style=for-the-badge&logo=docker)

一套专为第六师兵团设计的、具有**未来科技感（Sci-Fi）**风格的高级库房管理系统。项目基于 Django + PostgreSQL + Docker 构建，严格遵循模块化开发规范，不仅视觉表现力卓越，更具备完整的工业级功能闭环。

---

## ✨ 核心亮点

### 🌌 赛博科技视觉美学
- **动态背景**: 登录页面集成 Canvas 实现的流光连线背景动画，营造指挥中心既视感。
- **发光 UI**: 全站使用深色模式（Dark Mode），配合 `#00d2ff` 电光蓝发光动效及斜切角（Clip-path）设计。
- **感知闭环**: 全站集成了 `Tech Loader`（加载器）、`Tech Toast`（提示框）以及 `Tech Modal`（自定义确认弹窗），彻底杜绝原生 `alert`。

### 🛡️ 安全与验证体系
- **混合验证**: 登录界面采用“用户名+密码+前端动态算术验证码”的多重校验机制。
- **权限隔离**: 后端由 Django 原生 Auth 驱动，所有管理页面均强制执行 `login_required` 校验。
- **退出锁定**: 退出登录需经过自定义 Sci-Fi 风格弹窗确认，保障操作安全。

### 🏗️ 模块化工程规范
- **模板继承**: 基于 `base.html` 实现百分百模板复用，所有逻辑模块化。
- **独立资源管理**: 
  - `ui.js`: 封装了全局通用的 UI 交互逻辑。
  - `auth.js`: 集中处理登录、注销等异步认证流程。
  - `base.css`: 统一定义按钮、输入框、菜单等 Sci-Fi 风格原子组件。

---

## 🛠️ 技术栈详情

| 维度 | 技术实现 |
| :--- | :--- |
| **后端框架** | Django 4.2.7 (Python 3.10) |
| **数据库** | PostgreSQL 15 |
| **静态资源** | HTML5, CSS3 (Native), JavaScript (ES6+) |
| **图标库** | Bootstrap Icons |
| **部署环境** | Docker Compose + 清华大学镜像源适配 |

---

## 📂 功能菜单架构

系统预置了完整的兵团业务架构，每个模块均映射独立的英文路径：

- 📊 **仪表盘** (dashboard) - 实时库存统计与动态监控。
- 📦 **货物入库** (goods-entry) - 资源准入登记流程。
- 🗄️ **类型管理** - 包含单位、品类、品种三级精细化分类。
- 🔍 **查询导出** (query-export) - 历史记录检索与报表生成。
- 📈 **日常管控** - 包含每日报表、系统预警、审批区域。
- 👥 **人员管理** - 包含考勤人员与出库人员的专项管理。

---

## 🚀 快速启动指南

### 1. 环境准备
确保您的机器已安装 `Docker` 与 `Docker Compose`。

### 2. 部署运行
```bash
# 进入项目根目录
cd label-2898

# 一键构建并启动
docker compose up -d --build
```
*注：构建过程中会自动使用清华大学镜像源（Tuna Mirror），确保持续集成的高速与稳定。*

### 3. 访问信息
- **系统入口**: [http://localhost:2898/login/](http://localhost:2898/login/)
- **初始化账号**: `admin`
- **初始化密码**: `123456789`
- **页面状态**: 所有业务页面均已就绪，开发中模块提供标准占位提示。

---

## 📋 工程目录规约

```text
label-2898/
├── backend/
│   ├── core/           # 项目配置 (settings.py, urls.py)
│   ├── warehouse/      # 业务逻辑 (views.py, auth 逻辑)
│   ├── static/         
│   │   ├── css/        # Sci-Fi 原子样式定义
│   │   └── js/         # UI 交互与认证拦截器
│   ├── templates/      # 模块化模板仓库
│   ├── Dockerfile      # 环境定义
│   └── init.sh         # 数据库自动迁移与超级账户预设
└── docker-compose.yml   # 基础设施编排
```

---
*Created by Antigravity for Sci-Fi Style Enterprise Solutions.*
