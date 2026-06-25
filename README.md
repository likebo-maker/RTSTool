# RTS工程师效率工具箱

面向 RTS 技术支持工程师的本地效率工具箱。当前包含两个已接入工具：

- `超时工单筛选`：上传工单报表和质量上升报表，筛选出 IVD 线指定状态、且尚未录入质量上升单的超时工单，并导出 Excel。
- `在线业务计算`：上传 MCC热线、视频工单、MSP工单、IVD客户群 4 个原始 Excel，自动计算在线业务指标、明细表和管理驾驶舱图表，并导出 1 个结果 Excel。

## 快速使用

macOS / Unix 终端进入项目根目录后执行：

```bash
chmod +x start.sh
./start.sh
```

脚本会自动安装依赖、构建前端、启动后端，并打开：

```text
http://127.0.0.1:8000
```

登录账号：

```text
用户名：admin
密码：admin
```

## 当前功能

- 企业级深色科技风登录页
- 登录页信息安全声明勾选确认、首次登录声明弹窗和主界面查看入口
- 工具箱首页总览
- 左侧导航、顶部信息栏、主内容区、底部状态栏
- 工单工具
  - 超时工单筛选
  - 在线业务计算
- Excel / CSV 上传、校验、处理进度、结果预览、结果下载
- 在线业务结果 Excel 内置公式、统计表、KPI 卡片和图表分析区
- 在线业务结果 Excel 输出 `计算逻辑` Sheet，便于核对字段、筛选条件、分子分母和公式
- Windows 单文件 exe 打包脚本
- 面向使用者的 Word 版操作说明文档

## 信息安全声明机制

- 登录页必须勾选 `我已阅读并同意《信息安全声明》` 后才允许执行登录；如果本机已有有效同意记录，登录页会自动勾选。
- 点击 `《信息安全声明》` 会打开完整声明弹窗；在登录页弹窗中点击同意会自动勾选并写入本机同意记录，但不会自动登录。
- 登录成功后，如果本机 localStorage 中没有确认记录，会自动弹出一次完整声明。
- 首次登录弹窗点击 `我已阅读并同意` 后会写入：

```text
rts_toolbox_disclaimer_agreed
```

存储内容包含 `agreed`、`agreeTime` 和 `version`。
- 登录后可通过顶部右侧 `信息安全声明` 入口再次查看。

## 超时工单筛选规则

1. 后端读取上传的工单报表，支持 `.xlsx / .xls / .xlsm / .csv`。
2. 筛选工单报表：
   - `大产线 = IVD`
   - `工单状态 in [服务执行中, 已派工, 已预约]`
3. 后端读取质量上升报表，用 `前续工单` 字段建立已存在工单号集合。
4. 遍历筛选后的工单报表：
   - 如果 `工单号` 不存在于质量上升报表，则保留整行。
   - 如果已存在，则排除。
5. 导出 Excel：
   - 文件名：`工单报表-已筛选.xlsx`
   - 工作表名：`工单报表 - 已筛选`
   - 表头与原工单报表保持一致
6. 接口额外返回最终结果前 10 行，用于前端预览。

## 在线业务计算规则

### 输入文件

在线业务计算只需要上传 4 个 Excel 文件：

1. `MCC热线原始数据.xlsx`
2. `视频工单原始数据.xlsx`
3. `MSP工单原始数据.xlsx`
4. `IVD客户群表.xlsx`

说明：后端同时兼容旧文件名 `IVD客户群数量2025.xlsx`。

### 核心校验

- 校验上传文件名和文件类型。
- 校验必需 Sheet。
- 校验必需字段。
- 年份从 MCC、视频、MSP 数据中的日期字段自动识别；如果存在多个年份，结果表按年份分别输出，下载文件名使用识别到的最大年份。

### 指标口径

- 热线渠道集合：
  - `001_热线申告`
  - `006_微信申告`
  - `009_一键报修申告`
- 视频转技术支持状态集合：
  - `技术支持解决`
  - `无需技术支持`
  - `转FSM平台派工`
  - `座席解决`
- 年度热线工单占比分子状态集合不包含 `座席解决`。
- 覆盖率分子状态集合不包含 `座席解决`，并且按 `客户ID` 去重。
- 年度热线整体解决率和热线解决率的分子同时满足：
  - 受理单 service call 状态 = `技术支持解决`
  - 申告渠道属于热线渠道集合

### 输出 Excel

最终只输出 1 个 Excel，例如：

```text
在线业务计算结果_YYYY.xlsx
```

Sheet 顺序固定：

1. `MCC热线原始数据`
2. `视频工单原始数据`
3. `MSP工单原始数据`
4. `双大`
5. `县域+社办AB类`
6. `JC+社办CD类`
7. `MCC热线客户去重明细`
8. `计算结果`
9. `计算逻辑`
10. `图表数据`，隐藏 Sheet，用于驱动 Excel 图表

`MCC热线客户去重明细` 生成规则：

- 数据来源为 MCC热线原始数据。
- 先按覆盖率分子状态集合筛选 MCC 数据：
  - `受理单(service call)状态 in [技术支持解决, 派工完成, 取消, 无需技术支持]`
- 排除客户ID为空的数据。
- 按客户ID去重，每个客户ID只保留一行。
- 在 `客户ID` 后插入 `客户层级`。
- 客户层级匹配顺序：
  - 先匹配 IVD 客户群中的 `双大` Sheet，命中则为 `双大`。
  - 未命中时匹配 `县域+社办AB类` Sheet，命中则为 `县域+社办AB类`。
  - 都未命中则为 `JC+社办CD类`。

`计算结果` Sheet 当前包含：

- `热线数据`
- `视频数据`
- `热线+视频数据`
- KPI 数字卡片
- 工单来源结构分析
- 热线与视频解决率对比
- 客户结构分布分析
- 热线客户覆盖率分析

统计表中的比例、解决率、覆盖率等结果使用 Excel 单元格公式生成，便于打开文件后核对计算来源。

`计算逻辑` Sheet 当前包含：

- 输入文件、Sheet 和必需字段说明
- 年度识别口径
- 热线、视频、MSP、CS 基础数量统计口径
- 客户层级匹配和覆盖率去重规则
- 热线、视频、热线+视频三类表格的分子、分母和 Excel 公式说明
- KPI 和图表数据来源说明

## 使用说明文档

面向最终使用者的 Word 版说明文档位于：

```text
docs/user_manual_output/RTS工程师效率工具箱_使用说明.docx
```

该文档只说明如何登录、上传、计算、下载和查看结果，不介绍软件设计。文档中使用的界面截图素材位于：

```text
docs/user_manual_assets/
```

## 项目结构

```text
.
├── README.md
├── requirements.txt
├── docs
│   ├── CODE_OVERVIEW.md
│   ├── user_manual_assets
│   └── user_manual_output
├── start.sh
├── backend
│   ├── main.py
│   ├── requirements.txt
│   └── output
├── frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src
│       ├── App.vue
│       ├── components
│       ├── services
│       │   └── ticketToolService.js
│       └── tools
│           ├── HomeOverview.vue
│           ├── TimeoutTicketTool.vue
│           └── OnlineBusinessTool.vue
└── packaging
    └── windows
        ├── build_windows.bat
        ├── build_windows.ps1
        └── launcher.py
```

更完整的代码说明见：[docs/CODE_OVERVIEW.md](docs/CODE_OVERVIEW.md)。

## 本地开发

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

前端开发地址：

```text
http://127.0.0.1:5173
```

如果本机 `5173` 已被其他项目占用，可以指定其他端口：

```bash
npm run dev -- --host 127.0.0.1 --port 5175
```

后端默认地址：

```text
http://127.0.0.1:8000
```

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/process` | 上传并处理超时工单筛选数据 |
| GET | `/api/download/{job_id}` | 下载超时工单筛选结果 |
| POST | `/api/online-business/process` | 上传并处理在线业务计算数据 |
| GET | `/api/online-business/download/{job_id}` | 下载在线业务计算结果 |

## Windows 独立程序打包

这个项目是 `Vue3 + FastAPI`，Windows 单文件 exe 通过 PyInstaller 打包。

环境要求：

- Windows 10/11
- Python 3.11 或 3.12 正式版
- Node.js LTS
- Git

不要使用 Python 3.13/3.14，也不要使用 Python 3.12 beta / rc 等预发布版本打包。当前 `pandas==2.2.3` 在新版本或预发布 Python 上可能没有可直接安装的 Windows wheel，pip 本身也可能出现兼容性问题。

后端启动时固定使用 `uvicorn` 的 `h11` HTTP 协议，不依赖 `httptools`。如果 Windows 上已经装过旧依赖，建议重新安装根目录依赖文件，避免继续使用 `uvicorn[standard]` 拉入的 `httptools`。

打包方式：

```text
packaging\windows\build_windows.bat
```

如需先手动安装或检查 Python 依赖，可在 Windows 项目根目录执行：

```bat
py -3.12 --version
py -3.12 -c "import sys; print(sys.version_info.releaselevel)"
py -3.12 -m pip install -r requirements.txt
```

其中 `releaselevel` 必须输出 `final`。如果输出 `beta` 或版本号类似 `3.12.0b2`，请安装 Python 3.12 正式版后再打包。

成功后输出：

```text
dist\RTS_Toolbox.exe
```

构建脚本行为：

- 如果 `frontend/dist/index.html` 不存在，会自动执行 `npm install` 和 `npm run build`。
- 如果 `frontend/dist/index.html` 已存在，脚本会直接复用当前前端构建产物。
- Python 依赖优先从根目录 `requirements.txt` 安装。
- 因此修改前端后建议先执行：

```bash
cd frontend
npm install
npm run build
```

构建日志：

```text
.build\windows\build.log
packaging\windows\build_bootstrap.log
```

exe 运行日志：

```text
%LOCALAPPDATA%\RTS_Toolbox\logs\runtime.log
```

exe 默认从 `8000` 开始寻找可用端口，启动后自动打开本机浏览器访问工具箱。

常见打包问题：

- `Compatible Python was not found`：未安装 Python 3.11/3.12 正式版，或当前只有 Python 3.13/3.14/3.12 beta。
- `InvalidVersion: '0.dev0'`：通常是 Python 3.12 beta 导致 pip 兼容异常，请安装 Python 3.12 正式版并删除 `%LOCALAPPDATA%\RTS_Toolbox_Build` 后重试。
- `httptools` 相关报错：当前代码已固定使用 `h11`，请确认使用的是最新 `requirements.txt` 和最新打包脚本。

## 扩展新工具

1. 在 `frontend/src/tools` 新增工具页面组件。
2. 在 `frontend/src/services` 新增 API 请求封装。
3. 在 `frontend/src/App.vue` 按 `activeTool` 加载新工具。
4. 在 `frontend/src/components/Sidebar.vue` 新增导航入口。
5. 如需首页入口，在 `frontend/src/tools/HomeOverview.vue` 增加工具卡片。
6. 后端新增 API 时，避免破坏现有 `/api/process` 和 `/api/download/{job_id}` 行为。

## 维护提示

- 登录当前是前端本地校验，不是安全认证系统。
- 后端导出文件会写入 `backend/output`，Windows exe 运行时会写入用户 AppData 下的运行目录。
- `frontend/dist`、`node_modules`、虚拟环境、导出 Excel、构建产物均不应提交到 Git。
- 当前业务逻辑集中在 `backend/main.py`，后续工具增多后建议拆分路由和服务模块。
