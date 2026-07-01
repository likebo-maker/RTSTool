# 技术支持效率平台

**Technical Support Efficiency Platform，简称 TSEP**

高效 · 专业 · 智能 · 连接

技术支持效率平台是面向技术支持团队的一站式本地数字化工作平台，集工单处理、业务数据分析、服务资质管理、培训发展管理、E课堂数据处理和授权管理于一体。平台采用深蓝科技风界面，支持本地运行、文件导入导出、结果预览、功能模块授权和授权中心管理。

Powered by RTS Team

## 快速启动

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

## 当前能力

- 品牌化登录页、首页、侧边栏、顶部栏、授权中心和关于平台页面
- 登录页信息安全声明勾选确认、首次登录声明弹窗和主界面查看入口
- 首页工具卡片授权状态展示，未授权功能置灰加锁但不隐藏
- 左侧导航、顶部信息栏、主内容区、底部状态栏
- 授权中心：查看授权用户、部门、版本、到期时间、机器码、授权状态和功能权限列表
- 按功能模块授权：菜单、首页卡片、页面入口和导出按钮均接入权限判断
- Excel / CSV 上传、校验、处理进度、结果预览、结果下载
- Windows 独立程序打包脚本和管理员端注册码生成工具

## 功能模块

### 工单工具

#### 超时工单筛选

上传工单报表与质量上升报表，自动筛选指定状态且未录入质量上升单的超时工单，并导出 Excel。

核心规则：

1. 读取工单报表，支持 `.xlsx / .xls / .xlsm / .csv`。
2. 筛选：
   - `大产线 = IVD`
   - `工单状态 in [服务执行中, 已派工, 已预约]`
3. 读取质量上升报表，用 `前续工单` 字段建立已存在工单号集合。
4. 工单号不在质量上升报表中的记录保留，否则排除。
5. 导出文件：`工单报表-已筛选.xlsx`。

#### 在线服务项目目标

上传 MCC热线、视频工单、MSP工单、IVD客户群数据，自动生成在线服务项目目标计算表。

输入文件：

1. `MCC热线原始数据.xlsx`
2. `视频工单原始数据.xlsx`
3. `MSP工单原始数据.xlsx`
4. `IVD客户群表.xlsx`

输出文件：

```text
在线服务项目目标计算表_YYYY.xlsx
```

输出内容包含：

- 源表 Sheet
- `MCC热线客户去重明细`
- `计算结果`
- `计算逻辑`
- 隐藏的图表数据 Sheet
- KPI 卡片、统计表和图表分析区

#### 在线服务考核指标

上传 MSP工单、MCC通话、视频服务、MCC热线、CRM视频、每日质检等源表，自动生成在线服务考核指标计算表。

输入文件：

1. `MSP工单总表.xlsx`
2. `MCC通话记录.csv`
3. `视频服务记录.xlsx`
4. `MCC热线工单.xlsx`
5. `CRM视频工单.csv`
6. `每日质检记录表.xlsx`

输出文件：

```text
在线服务考核指标计算表.xlsx
```

输出内容包含：

- `源表-MSP工单总表`
- `源表-MCC通话记录`
- `源表-视频服务记录`
- `源表-MCC热线工单`
- `源表-CRM视频工单`
- `源表-每日质检记录`
- `计算结果`
- `计算逻辑`

### 培训发展管理

#### 中国区人员服务资质地图

导入人员服务资质表，按分公司、产品线、型号、资质类型和到期状态展示全国服务能力分布，支持地图、排行、明细和 Excel 导出。

#### 中国区培训覆盖地图

导入培训数据，按分公司、大区、产线、培训周期和培训结果展示全国培训覆盖与培训效果，支持地图、图表、分公司明细和 Excel 导出。

### E课堂数据处理

E课堂学习数据处理入口已在导航和首页保留，后续可接入学习数据清洗、统计和结果导出。

## 授权机制

平台支持按功能模块授权。注册码中的 `features` 字段可以控制不同工具和高级能力是否可用。

当前功能标识：

| 功能名称 | 功能标识 |
| --- | --- |
| 超时工单筛选 | `timeout_filter` |
| 在线服务项目目标 | `online_service_target` |
| 在线服务考核指标 | `online_service_kpi` |
| 中国区人员服务资质地图 | `qualification_map` |
| 中国区培训覆盖地图 | `training_map` |
| E课堂数据处理 | `elearning_data` |
| Excel导出 | `export_excel` |
| PDF导出 | `export_pdf` |
| AI助手 | `ai_assistant` |
| 管理员权限 | `admin` |

授权行为：

- 已授权功能正常显示和进入。
- 未授权功能不隐藏，显示为置灰加锁状态。
- 点击未授权功能会弹出授权提示，可复制机器码或进入授权中心。
- 直接进入未授权页面时，会显示未授权页面而不是业务内容。
- 授权过期后，只允许访问首页和授权中心。
- 旧版注册码如果没有 `features` 字段，默认只开放 `timeout_filter`，不会导致系统崩溃。

安全说明：

- 用户端只内置公钥，负责验签和权限判断。
- 私钥只在管理员端注册码生成工具中使用。
- `features` 字段参与签名，用户不能通过手动修改本地授权文件绕过功能权限。

## 信息安全声明机制

- 登录页必须勾选 `我已阅读并同意《信息安全声明》` 后才允许登录。
- 如果本机已有有效同意记录，登录页会自动勾选。
- 点击 `《信息安全声明》` 会打开完整声明弹窗。
- 登录成功后，如果本机 localStorage 中没有确认记录，会自动弹出一次完整声明。
- 登录后可通过侧边栏 `系统管理 -> 信息安全声明` 或顶部入口再次查看。

本地存储键：

```text
rts_toolbox_disclaimer_agreed
```

## 项目结构

```text
.
├── README.md
├── start.sh
├── requirements.txt
├── pyproject.toml
├── backend
│   ├── main.py
│   ├── license_service.py
│   ├── requirements.txt
│   └── output
├── frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src
│       ├── App.vue
│       ├── assets/logo
│       ├── components
│       ├── config
│       ├── services
│       ├── tools
│       └── utils
├── tools
│   ├── license_core.py
│   ├── license_generator_cli.py
│   └── license_generator_gui.py
├── packaging
│   └── windows
└── docs
```

更完整的代码说明见：[docs/CODE_OVERVIEW.md](docs/CODE_OVERVIEW.md)。

## 本地开发

推荐使用根目录脚本启动完整平台：

```bash
./start.sh
```

后端单独启动：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/main.py
```

前端单独启动：

```bash
cd frontend
npm install
npm run dev
```

前端开发地址：

```text
http://127.0.0.1:5173
```

后端默认地址：

```text
http://127.0.0.1:8000
```

如果端口被占用，可调整 `PORT` 或 Vite 启动端口。

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/license/machine-code` | 获取当前机器码 |
| GET | `/api/license/status` | 获取当前授权状态 |
| POST | `/api/license/activate` | 激活或更新注册码 |
| POST | `/api/license/verify` | 验证当前授权 |
| POST | `/api/process` | 上传并处理超时工单筛选数据 |
| GET | `/api/download/{job_id}` | 下载超时工单筛选结果 |
| POST | `/api/online-business/process` | 上传并处理在线服务项目目标数据 |
| GET | `/api/online-business/download/{job_id}` | 下载在线服务项目目标计算表 |
| POST | `/api/online-assessment/process` | 上传并处理在线服务考核指标数据 |
| GET | `/api/online-assessment/download/{job_id}` | 下载在线服务考核指标计算表 |

## 管理员端注册码生成

图形界面：

```bash
python tools/license_generator_gui.py
```

命令行：

```bash
python tools/license_generator_cli.py \
  --machine XXXX-XXXX-XXXX-XXXX \
  --user 张三 \
  --department 华东区 \
  --expire 2027-12-31 \
  --version PRO \
  --features timeout_filter online_service_target export_excel
```

生成器会将 `features` 写入注册码载荷并参与签名。

## Windows 独立程序打包

该项目是 `Vue3 + FastAPI`，Windows 独立程序通过 PyInstaller 打包。

环境要求：

- Windows 10/11
- Python 3.11 或 3.12 正式版
- Node.js LTS
- Git

打包方式：

```text
packaging\windows\build_windows.bat
```

说明：

- 如果 `frontend/dist/index.html` 不存在，脚本会自动执行 `npm install` 和 `npm run build`。
- 如果 `frontend/dist/index.html` 已存在，脚本会复用当前前端构建产物。
- Python 依赖优先从根目录 `requirements.txt` 安装。
- 当前打包脚本仍使用历史输出文件名，后续可单独同步为新平台名称。

构建日志：

```text
.build\windows\build.log
packaging\windows\build_bootstrap.log
```

运行日志：

```text
%LOCALAPPDATA%\技术支持效率平台\logs\runtime.log
```

常见打包问题：

- `Compatible Python was not found`：未安装 Python 3.11/3.12 正式版。
- `InvalidVersion: '0.dev0'`：通常是 Python 预发布版本导致 pip 兼容异常。
- `httptools` 相关报错：当前后端固定使用 `h11`，请确认使用最新依赖和打包脚本。

## 扩展新工具

1. 在 `frontend/src/tools` 新增工具页面组件。
2. 在 `frontend/src/services` 新增 API 请求封装。
3. 在 `frontend/src/App.vue` 按 `activeTool` 加载新工具。
4. 在 `frontend/src/components/Sidebar.vue` 新增导航入口。
5. 在 `frontend/src/tools/HomeOverview.vue` 增加首页工具卡片。
6. 在 `frontend/src/utils/licenseFeatures.js` 增加工具与功能权限映射。
7. 后端新增 API 时，按模块调用 `require_valid_license(feature)`。

## 维护提示

- 登录当前是前端本地校验，不是安全认证系统。
- 后端导出文件会写入 `backend/output`，Windows 独立程序运行时会写入用户本地应用数据目录。
- `frontend/dist`、`node_modules`、虚拟环境、导出 Excel、构建产物均不应提交到 Git。
- 当前业务逻辑主要集中在 `backend/main.py`，后续工具增多后建议拆分路由和服务模块。
