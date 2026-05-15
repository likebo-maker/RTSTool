# RTS工程师效率工具箱

面向 RTS 技术支持工程师的企业级效率工具箱平台。当前第一阶段内置「超时工单筛选工具」，用于上传「工单报表」和「质量上升报表」，筛选出 IVD 且状态为「服务执行中 / 已派工 / 已预约」，并且未出现在质量上升报表「前续工单」中的工单。

## 一键启动

macOS 终端进入项目根目录后执行：

```bash
chmod +x start.sh
./start.sh
```

脚本会自动安装缺失依赖、打包前端、启动后端，并打开：

```text
http://127.0.0.1:8000
```

## Windows 独立程序打包

这个项目当前不是 Streamlit，而是 `Vue3 + FastAPI`。要做成 Windows 单文件 `.exe`，正确做法是先构建前端静态资源，再用 PyInstaller 把 Python 启动器、后端接口、pandas/openpyxl/python-multipart 等依赖一起打包。

### 1. 环境准备

- Windows 10/11
- Python 3.11 或 3.12（不要使用 Python 3.13/3.14；当前 `pandas==2.2.3` 在这些版本上可能没有可直接安装的 Windows wheel，会触发源码编译失败）
- Node.js LTS
- Git

### 2. 安装依赖

在 Windows 上进入项目根目录后执行：

```powershell
cd frontend
npm install
npm run build
```

后端依赖和 PyInstaller 会由打包脚本自动安装到：

```text
%LOCALAPPDATA%\RTS_Toolbox_Build\.venv-py3.12
```

如果你的电脑同时装了多个 Python 版本，脚本会优先选择 `py -3.12`，其次选择 `py -3.11`，不会再误用 Python 3.14。

可在 Windows 命令行先检查：

```powershell
py -3.12 --version
```

如果提示找不到 3.12，请先安装 Python 3.12，再重新运行打包脚本。

### 3. 打包命令

直接双击运行：

```text
packaging\windows\build_windows.bat
```

或者在 PowerShell 运行：

```powershell
.\packaging\windows\build_windows.ps1
```

### 4. 输出文件

打包成功后，生成：

```text
dist\RTS_Toolbox.exe
```

这个 exe 启动后会自动打开浏览器并启动本地服务。

如果打包失败，详细日志会输出到：

```text
.build\windows\build.log
```

如果失败发生在 PowerShell 启动前，还会在脚本同目录生成：

```text
packaging\windows\build_bootstrap.log
```

### 5. 打包后结构

```text
dist\
  RTS_Toolbox.exe
```

### 6. 测试方法

1. 双击 exe。
2. 等待浏览器自动打开。
3. 用 `admin / admin` 登录。
4. 上传两份 Excel，执行处理，确认导出和下载正常。

### 7. 适配说明

- 资源文件通过 PyInstaller 一并打包进 exe，不依赖外部图片或前端文件。
- 输出文件默认写到用户本地 AppData，避免没有写权限。
- `backend/main.py` 已做冻结环境适配，能在 PyInstaller 环境下找到前端资源。
- 这个方案不需要用户安装 Python，也不需要单独安装库。

## 项目结构

```text
.
├── start.sh
├── packaging
│   └── windows
│       ├── build_windows.bat
│       ├── build_windows.ps1
│       └── launcher.py
├── backend
│   ├── main.py
│   ├── __init__.py
│   ├── output
│   └── requirements.txt
└── frontend
    ├── index.html
    ├── package.json
    ├── src
    │   ├── App.vue
    │   ├── components
    │   │   ├── ActionPanel.vue
    │   │   ├── FileUploadCard.vue
    │   │   ├── PreviewTable.vue
    │   │   ├── Sidebar.vue
    │   │   ├── StatsGrid.vue
    │   │   ├── StatusBar.vue
    │   │   ├── ToolHeader.vue
    │   │   ├── ToolPlaceholder.vue
    │   │   └── TopBar.vue
    │   ├── main.js
    │   ├── services
    │   │   └── ticketToolService.js
    │   ├── tools
    │   │   └── TimeoutTicketTool.vue
    │   └── styles.css
    └── vite.config.js
```

## 前端架构

- `App.vue`：平台壳层，负责侧边栏导航、顶部信息栏、主内容区、底部状态栏。
- `components/Sidebar.vue`：左侧导航，已包含「首页」「工单工具 / 超时工单筛选」「E课堂数据处理」入口。
- `components/TopBar.vue`：平台名称、Logo、用户信息、通知与深色模式标识。
- `components/StatusBar.vue`：系统状态、处理日志、工具版本号。
- `tools/TimeoutTicketTool.vue`：超时工单筛选工具主界面，保留原上传、处理、进度、统计、下载交互逻辑。
- `services/ticketToolService.js`：前端请求封装，后续新增工具可按同样方式新增独立 service。
- `components/FileUploadCard.vue`、`ActionPanel.vue`、`StatsGrid.vue`、`PreviewTable.vue`：可复用工具组件。

## 扩展新工具

1. 在 `frontend/src/tools` 新增工具组件，例如 `EclassDataTool.vue`。
2. 如需调用后端，在 `frontend/src/services` 新增对应 service。
3. 在 `App.vue` 中按 `activeTool` 加载新工具组件。
4. 在 `Sidebar.vue` 中新增或启用导航入口。
5. 后端新增 API 时放在 `backend/main.py` 或拆分独立路由模块，避免修改既有 `/api/process` 和 `/api/download/{job_id}` 的工单逻辑。

## 后端启动

如果在 PyCharm / Cursor / VS Code 里直接运行，请打开并运行：

```text
backend/main.py
```

如果使用命令行：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

如果 IDE 使用的是项目根目录的 `.venv`，需要在项目根目录执行：

```bash
.venv/bin/python -m ensurepip --upgrade
.venv/bin/python -m pip install -r backend/requirements.txt
```

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:5173
```

## 业务逻辑

1. 后端读取上传的工单报表，支持 `.xlsx / .xls / .xlsm / .csv`，筛选：
   - `大产线 = IVD`
   - `工单状态 ∈ [服务执行中，已派工，已预约]`
2. 后端读取质量上升报表，用 `前续工单` 字段建立已存在工单号集合。
3. 遍历筛选后的工单报表，如果 `工单号` 不存在于质量上升报表，则保留整行。
4. 导出 Excel，表头与原工单报表一致，工作表名为 `工单报表 - 已筛选`。
5. 接口额外返回最终结果前 10 行用于前端预览，不影响导出文件内容。

## API

- `GET /api/health`：健康检查
- `POST /api/process`：上传并处理 Excel
- `GET /api/download/{job_id}`：下载最终结果
