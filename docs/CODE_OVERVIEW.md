# RTS工程师效率工具箱代码说明

## 1. 项目定位

本项目是面向 RTS 技术支持工程师的本地效率工具箱。当前已上线核心工具为「超时工单筛选工具」，用于上传「工单报表」和「质量上升报表」，由后端完成 Excel 解析、筛选、对比和导出。

当前技术栈：

- 前端：Vue 3、Vite、lucide-vue-next
- 后端：FastAPI、pandas、openpyxl、python-multipart
- 打包：PyInstaller，Windows 单文件 exe
- 本地启动：`start.sh`

## 2. 目录结构

```text
.
├── README.md                         # 项目使用说明
├── start.sh                          # macOS / Unix 一键启动脚本
├── backend
│   ├── main.py                       # FastAPI 应用、业务逻辑、前端静态资源托管
│   ├── requirements.txt              # 后端依赖
│   └── output
│       └── .gitkeep                  # 导出目录占位，导出的 xlsx 不入库
├── frontend
│   ├── index.html                    # Vite HTML 入口
│   ├── package.json                  # 前端依赖与脚本
│   ├── vite.config.js                # Vite 构建配置
│   └── src
│       ├── App.vue                   # 应用壳层和路由状态
│       ├── main.js                   # Vue 挂载入口
│       ├── styles.css                # 全局深色科技风样式
│       ├── components                # 通用 UI 组件
│       ├── services                  # 前端 API 请求封装
│       └── tools                     # 具体工具页面
└── packaging
    └── windows
        ├── build_windows.bat         # Windows 双击打包入口
        ├── build_windows.ps1         # PyInstaller 打包主脚本
        └── launcher.py               # exe 运行入口，启动后端并打开浏览器
```

## 3. 前端架构

### 3.1 应用入口

[frontend/src/App.vue](../frontend/src/App.vue) 是前端应用壳层，负责：

- 登录前显示 `LoginView`
- 登录后显示工具箱主框架
- 管理当前工具状态 `activeTool`
- 管理侧边栏折叠状态 `sidebarCollapsed`
- 接收工具运行状态和日志，传递给底部状态栏

当前工具切换逻辑：

- `home`：首页总览
- `timeout-ticket-filter`：超时工单筛选工具
- 其他 key：进入占位工具页

### 3.2 登录页

[frontend/src/components/LoginView.vue](../frontend/src/components/LoginView.vue) 实现本地登录层。

当前校验规则：

- 用户名：`admin`
- 密码：`admin`
- 校验时不区分大小写
- 空输入提示：`请输入用户名和密码`
- 账号或密码错误提示：`用户名或密码错误，请重新输入`

登录状态只保存在前端内存中，刷新页面后需要重新登录。当前没有接入后端认证、数据库或会话持久化。

### 3.3 平台框架组件

- [Sidebar.vue](../frontend/src/components/Sidebar.vue)：左侧导航栏，包含首页、工单工具、超时工单筛选、E课堂数据处理入口。
- [TopBar.vue](../frontend/src/components/TopBar.vue)：顶部信息栏，显示平台名称和深色模式标识。
- [StatusBar.vue](../frontend/src/components/StatusBar.vue)：底部状态栏，显示当前状态、最新日志和版本号。
- [ToolPlaceholder.vue](../frontend/src/components/ToolPlaceholder.vue)：规划中工具的占位页。

侧边栏当前为手动折叠/展开：点击按钮切换，折叠后保持折叠状态，不再依赖 hover 自动展开。

### 3.4 首页总览

[frontend/src/tools/HomeOverview.vue](../frontend/src/tools/HomeOverview.vue) 是工具箱首页，包含：

- 平台欢迎区
- 「快速进入超时工单筛选」按钮
- 当前已上线工具卡片
- 后续工具规划卡片
- 服务状态与版本信息

首页的核心目标是让用户一进入系统即可知道当前可用工具，并能一次点击进入核心功能。

### 3.5 超时工单筛选工具

[frontend/src/tools/TimeoutTicketTool.vue](../frontend/src/tools/TimeoutTicketTool.vue) 是当前核心业务页面，包含：

- 工单报表上传
- 质量上升报表上传
- 执行处理按钮
- 进度条与状态提示
- 数据统计卡片
- 前 10 行结果预览
- 下载最终表格按钮

工具调用 [ticketToolService.js](../frontend/src/services/ticketToolService.js) 中的：

- `processTimeoutTickets()`：上传两个文件到 `/api/process`
- `downloadResult()`：触发 `/api/download/{job_id}` 下载

## 4. 后端架构

后端主要代码集中在 [backend/main.py](../backend/main.py)。

### 4.1 应用职责

`backend/main.py` 同时负责：

- FastAPI 应用初始化
- CORS 配置
- 前端静态资源托管
- Excel / CSV 文件读取
- 字段别名识别
- 工单筛选和质量上升报表对比
- 导出 Excel
- PyInstaller 冻结环境兼容
- 本地运行时自动打开浏览器

### 4.2 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/process` | 上传并处理工单报表、质量上升报表 |
| GET | `/api/download/{job_id}` | 下载处理后的 Excel |
| GET | `/` | 返回前端首页 |
| GET | `/{full_path:path}` | 支持前端 SPA 路由回退 |

### 4.3 上传文件支持

后端支持以下格式：

- `.xlsx`
- `.xlsm`
- `.xls`
- `.csv`

CSV 读取时优先使用 `utf-8-sig`，失败后回退到 `gbk`。

### 4.4 字段别名

工单报表必需字段：

- 大产线：`大产线`、`产品线`
- 工单状态：`工单状态`、`状态`
- 工单号：`工单号`、`服务工单号`、`工单编号`

质量上升报表必需字段：

- 前续工单：`前续工单`、`工单号`、`服务工单号`、`前续工单号`

字段匹配会忽略表头中的空白字符。

### 4.5 业务处理流程

1. 读取工单报表。
2. 读取质量上升报表。
3. 在工单报表中筛选：
   - `大产线 = IVD`
   - `工单状态 ∈ [服务执行中，已派工，已预约]`
4. 读取质量上升报表的 `前续工单` 字段，构建已存在工单号集合。
5. 遍历筛选后的工单报表：
   - 如果工单号不存在于质量上升报表的前续工单集合中，则保留整行。
   - 如果已存在，则排除。
6. 生成导出文件：
   - 文件名：`工单报表-已筛选-{job_id}.xlsx`
   - 工作表名：`工单报表 - 已筛选`
   - 表头保持原工单报表一致
7. 返回统计信息、下载地址和前 10 行预览数据。

### 4.6 统计字段

`/api/process` 返回的 `stats` 包含：

- `work_order_total`：工单报表总行数
- `quality_total`：质量上升报表总行数
- `pending_total`：按大产线和状态筛选后的待筛选行数
- `matched_quality_ticket_total`：待筛选工单中已存在于质量上升报表的数量
- `result_total`：最终导出数量

## 5. 运行方式

### 5.1 macOS / Unix 一键启动

```bash
chmod +x start.sh
./start.sh
```

脚本会自动：

1. 检查 `python3`、`npm`、`curl`
2. 创建或复用根目录 `.venv`
3. 安装后端依赖
4. 安装前端依赖
5. 执行前端构建
6. 启动后端服务
7. 打开浏览器访问 `http://127.0.0.1:8000`

### 5.2 前后端分开开发

后端：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

前端：

```bash
cd frontend
npm install
npm run dev
```

浏览器访问：

```text
http://127.0.0.1:5173
```

开发模式下，前端请求 `/api/process`，需要确保后端服务同时运行。

## 6. Windows 打包

Windows 打包入口：

```text
packaging\windows\build_windows.bat
```

核心脚本：

- [build_windows.bat](../packaging/windows/build_windows.bat)：双击入口，负责调用 PowerShell 并生成 bootstrap 日志。
- [build_windows.ps1](../packaging/windows/build_windows.ps1)：构建前端、创建打包虚拟环境、安装依赖、执行 PyInstaller。
- [launcher.py](../packaging/windows/launcher.py)：exe 运行入口，启动 FastAPI 服务并自动打开浏览器。

### 6.1 Python 版本要求

打包脚本只允许 Python 3.11 或 3.12。

原因：当前 `pandas==2.2.3` 在 Python 3.13/3.14 上可能没有稳定的 Windows wheel，容易触发源码编译失败。

脚本探测顺序：

1. `py -3.12`
2. `py -3.11`
3. `py -0p` 中列出的 3.12 / 3.11 真实路径
4. `python`

### 6.2 打包输出

成功后生成：

```text
dist\RTS_Toolbox.exe
```

exe 运行后会：

1. 找可用端口，默认从 `8000` 开始。
2. 启动本地 FastAPI 服务。
3. 自动打开浏览器。
4. 托管已打包的前端静态资源。

### 6.3 日志位置

构建日志：

```text
.build\windows\build.log
packaging\windows\build_bootstrap.log
```

exe 运行日志：

```text
%LOCALAPPDATA%\RTS_Toolbox\logs\runtime.log
```

导出文件运行时存储：

```text
%LOCALAPPDATA%\RTS工程师效率工具箱\output
```

## 7. 扩展新工具

新增一个工具时，建议按以下步骤：

1. 在 `frontend/src/tools` 新增工具页面组件。
2. 如果需要请求后端，在 `frontend/src/services` 新增对应 service。
3. 在 `frontend/src/App.vue` 中根据新的 `activeTool` 加载工具组件。
4. 在 `frontend/src/components/Sidebar.vue` 中新增导航入口。
5. 如需首页入口，在 `frontend/src/tools/HomeOverview.vue` 中增加工具卡片。
6. 后端新增 API 时，优先保持现有 `/api/process` 和 `/api/download/{job_id}` 行为不变。

## 8. Git 与忽略规则

`.gitignore` 当前排除：

- `.venv/`
- `.idea/`
- `.build/`
- `dist/`
- `frontend/node_modules/`
- `frontend/dist/`
- 后端导出的 Excel
- Python 缓存和日志文件
- 未使用或临时资源

需要提交的通常是：

- 前端源码
- 后端源码
- 打包脚本
- 依赖清单
- README / docs 文档
- 必要的静态资源

## 9. 当前约束

- 登录只做前端本地校验，不具备安全认证能力。
- 后端导出文件没有定时清理机制。
- 业务逻辑目前集中在 `backend/main.py`，后续工具增多后建议拆分路由和服务模块。
- 当前工具只处理第一张工作表。
- 导出表头保持原工单报表一致，不额外补充质量上升报表字段。
