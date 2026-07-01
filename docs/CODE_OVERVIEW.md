# 技术支持效率平台代码总览

## 1. 项目定位

本项目是面向技术支持、服务运营和培训管理场景的本地效率平台。它以浏览器式前端作为操作界面，以 FastAPI 后端处理 Excel、Word、授权和文件输出，最终可打包成 Windows 单文件 exe 供用户离线使用。

当前已接入的核心能力包括：

- 超时工单筛选
- 在线服务项目目标计算
- 在线服务考核指标计算
- 中国区人员服务资质地图
- 中国区培训覆盖地图
- E课堂 IVD 大练兵数据处理
- E课堂 IVD 交流会数据处理
- Windows 授权与 License Center

技术栈：

- 前端：Vue 3、Vite、lucide-vue-next、ECharts、xlsx
- 后端：FastAPI、pandas、openpyxl、python-multipart、python-docx、matplotlib
- 授权：RSA PSS + SHA-256，依赖 `cryptography`
- 打包：PyInstaller，Windows 单文件 exe

## 2. 维护文档索引

详细计算逻辑已经按模块拆分到独立文档：

- [modules_index.md](modules_index.md)：模块文档总索引
- [module_timeout_ticket_filter.md](module_timeout_ticket_filter.md)：超时工单筛选
- [module_online_service_target.md](module_online_service_target.md)：在线服务项目目标
- [module_online_service_assessment.md](module_online_service_assessment.md)：在线服务考核指标
- [module_service_qualification_map.md](module_service_qualification_map.md)：人员服务资质地图
- [module_training_coverage_map.md](module_training_coverage_map.md)：培训覆盖地图
- [module_eclass_common_framework.md](module_eclass_common_framework.md)：E课堂公共框架
- [module_eclass_big_teach.md](module_eclass_big_teach.md)：E课堂 IVD 大练兵
- [module_eclass_communication.md](module_eclass_communication.md)：E课堂 IVD 交流会
- [module_license_and_runtime.md](module_license_and_runtime.md)：授权与运行时

本文件只做代码结构总览。维护具体业务口径时，优先阅读对应模块文档。

## 3. 目录结构

```text
.
├── backend
│   ├── main.py                         # FastAPI 主应用、通用 Excel 计算接口、静态资源托管
│   ├── license_service.py              # 授权校验、机器码、功能权限
│   ├── requirements.txt                # 后端依赖
│   ├── legacy
│   │   └── eclass                      # E课堂旧算法迁移代码
│   ├── services
│   │   └── eclass                      # E课堂 router、schema、runner、adapter
│   └── output                          # 开发环境导出目录
├── frontend
│   ├── package.json
│   ├── vite.config.js
│   └── src
│       ├── App.vue                     # 前端壳层、工具切换、授权拦截
│       ├── components                  # 通用 UI 组件
│       ├── services                    # API、本地缓存、页面状态
│       ├── tools                       # 各业务工具页面
│       └── utils                       # 地图聚合、Excel 解析、授权工具函数
├── packaging
│   └── windows
│       ├── build_windows.bat           # Windows 双击打包入口
│       ├── build_windows.ps1           # 前端构建、依赖安装、PyInstaller 打包
│       └── launcher.py                 # exe 入口，启动 FastAPI 并打开浏览器
├── tools
│   ├── license_core.py                 # 注册码生成核心逻辑
│   └── license_generator_gui.py        # Tkinter 授权生成工具
└── docs                                # 维护文档
```

## 4. 前端架构

### 4.1 应用入口

[frontend/src/App.vue](../frontend/src/App.vue) 是前端总壳层，负责：

- 启动时读取 `/api/license/status`
- 未授权时显示授权激活页
- 授权通过后显示本地登录页
- 登录后显示平台主框架
- 管理当前工具 `activeTool`
- 根据授权信息阻止未授权模块访问
- 向工具组件传递 `canExportExcel`
- 汇总工具状态和日志到底部状态栏

当前主要工具 key：

- `home`
- `timeout-ticket-filter`
- `online-business-calculation`
- `online-service-assessment`
- `service-qualification-map`
- `training-coverage-map`
- `eclass-data`
- `license-center`
- `about-platform`

### 4.2 平台框架组件

- [Sidebar.vue](../frontend/src/components/Sidebar.vue)：左侧导航，按工单工具、培训发展管理、E课堂、系统管理分组。
- [TopBar.vue](../frontend/src/components/TopBar.vue)：顶部栏，展示品牌、授权入口和信息安全声明。
- [StatusBar.vue](../frontend/src/components/StatusBar.vue)：底部运行状态和最近日志。
- [LoginView.vue](../frontend/src/components/LoginView.vue)：本地登录页。
- [LicenseActivationView.vue](../frontend/src/components/LicenseActivationView.vue)：未授权激活页。
- [UnauthorizedState.vue](../frontend/src/components/UnauthorizedState.vue)：功能未授权页面。
- [SecurityDisclaimerModal.vue](../frontend/src/components/SecurityDisclaimerModal.vue)：信息安全声明。

本地登录仍是前端内存状态，账号密码校验不等同于安全认证。真正的功能控制依赖授权接口返回的功能权限。

### 4.3 后端计算型工具页面

这些页面上传文件到 FastAPI，由后端生成结果 Excel：

- [TimeoutTicketTool.vue](../frontend/src/tools/TimeoutTicketTool.vue)
- [OnlineBusinessTool.vue](../frontend/src/tools/OnlineBusinessTool.vue)
- [OnlineAssessmentTool.vue](../frontend/src/tools/OnlineAssessmentTool.vue)

对应 service：

- [ticketToolService.js](../frontend/src/services/ticketToolService.js)
- [onlineBusinessService.js](../frontend/src/services/onlineBusinessService.js)
- [onlineAssessmentService.js](../frontend/src/services/onlineAssessmentService.js)

### 4.4 前端本地解析型工具页面

这两类地图工具不把 Excel 发给后端，而是在浏览器本地解析和聚合：

- [ServiceQualificationMap.vue](../frontend/src/tools/ServiceQualificationMap.vue)
- [TrainingCoverageMap.vue](../frontend/src/tools/TrainingCoverageMap.vue)

核心工具函数：

- `qualificationParser.js`：资质 Excel 解析
- `qualificationAggregator.js`：资质指标和地图点聚合
- `qualificationTypes.js`：资质到期状态计算
- `trainingParser.js`：培训 Excel 解析
- `trainingAggregator.js`：培训指标和地图点聚合
- `trainingStatusNormalizer.js`：培训结果合格/不合格归一化

导入结果会通过 [localDataStore.js](../frontend/src/services/localDataStore.js) 缓存在 IndexedDB，失败时降级到 localStorage。

### 4.5 E课堂页面

[EclassDataTool.vue](../frontend/src/tools/EclassDataTool.vue) 是 E课堂统一页面，通过后端 schema 动态渲染上传槽位。当前支持：

- IVD 大练兵
- IVD 交流会

前端重点：

- 文件夹上传使用 [DirectoryUploadCard.vue](../frontend/src/components/DirectoryUploadCard.vue)。
- API 封装在 [eclassService.js](../frontend/src/services/eclassService.js)。
- 页面状态按 `productLine::moduleKey` 缓存在 [eclassPageState.js](../frontend/src/services/eclassPageState.js)，避免大练兵和交流会切换时互相覆盖结果。
- “打开输出文件夹”调用 `/api/eclass/open-output-folder/{job_id}`。

## 5. 后端架构

### 5.1 FastAPI 主应用

[backend/main.py](../backend/main.py) 负责：

- FastAPI 应用初始化
- CORS 配置
- 前端静态资源托管
- 非 E课堂的 Excel 计算模块
- 授权接口
- 下载接口
- PyInstaller 冻结路径兼容
- 开发环境直接运行时自动打开浏览器

后端会通过 `app.include_router(eclass_router)` 接入 E课堂子路由。

### 5.2 API 列表

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/license/machine-code` | 获取当前机器码 |
| GET | `/api/license/status` | 获取授权状态 |
| POST | `/api/license/activate` | 激活注册码 |
| POST | `/api/license/verify` | 校验当前授权 |
| POST | `/api/process` | 超时工单筛选 |
| GET | `/api/download/{job_id}` | 下载超时工单筛选结果 |
| POST | `/api/online-business/process` | 在线服务项目目标计算 |
| GET | `/api/online-business/download/{job_id}` | 下载在线服务项目目标结果 |
| POST | `/api/online-assessment/process` | 在线服务考核指标计算 |
| GET | `/api/online-assessment/download/{job_id}` | 下载在线服务考核结果 |
| GET | `/api/eclass/options` | 获取 E课堂产线和业务方向 |
| GET | `/api/eclass/upload-schema` | 获取 E课堂上传 schema |
| POST | `/api/eclass/process` | 处理 E课堂数据 |
| GET | `/api/eclass/download/{job_id}/{file_id}` | 下载 E课堂结果 |
| POST | `/api/eclass/open-output-folder/{job_id}` | 打开 E课堂输出文件夹 |
| GET | `/` | 返回前端首页 |
| GET | `/{full_path:path}` | SPA 路由回退 |

### 5.3 授权拦截

业务接口会调用 `require_valid_license(feature)` 做权限校验。主要对应关系：

- 超时工单筛选：`timeout_filter`
- 在线服务项目目标：`online_service_target`
- 在线服务考核指标：`online_service_kpi`
- E课堂数据处理：`elearning_data`
- 下载 Excel：额外需要 `export_excel`

前端本地解析型工具的授权主要在前端路由层拦截，功能 key 定义在 [licenseFeatures.js](../frontend/src/utils/licenseFeatures.js)。

### 5.4 输出目录

开发环境普通后端计算输出：

```text
backend/output
```

打包后普通后端计算输出：

```text
%LOCALAPPDATA%\技术支持效率平台\output
```

E课堂开发环境任务目录：

```text
backend/output/eclass/{job_id}
```

E课堂打包后任务目录：

```text
%LOCALAPPDATA%\技术支持效率平台\output\eclass\{job_id}
```

E课堂最终用户结果目录：

```text
%USERPROFILE%\Downloads\IVD大练兵数据统计结果
%USERPROFILE%\Downloads\IVD交流会数据统计结果
```

## 6. E课堂子系统

E课堂已从 `backend/main.py` 中分离到 `backend/services/eclass`：

- `schemas.py`：定义产线、业务方向和上传槽位。
- `router.py`：定义 `/api/eclass/*` 接口。
- `runner.py`：任务调度、保存上传、调用 adapter、发布结果、写 manifest。
- `file_utils.py`：安全文件名、路径校验、上传保存、结果发布。
- `preview.py`：结果预览。
- `adapters/ivd_big_teach_adapter.py`：调用大练兵底层算法。
- `adapters/ivd_communication_adapter.py`：调用交流会底层算法。

底层旧算法保留在：

- `backend/legacy/eclass/big_teach.py`
- `backend/legacy/eclass/Comunication_meeting.py`

新增 E课堂模块时，建议流程：

1. 在 `schemas.py` 增加产线和业务方向组合。
2. 新建 adapter，只接收 `input_files` 和 `output_dir`。
3. 在 `runner.py::_resolve_adapter` 注册组合。
4. 必要时把旧脚本迁移到 `backend/legacy/eclass`。
5. 确认打包脚本加入 hidden import。

## 7. 授权与 License Center

后端授权逻辑在 [backend/license_service.py](../backend/license_service.py)。

主要能力：

- Windows 启用授权校验。
- 非 Windows 默认放行全部功能。
- 根据 Windows MachineGuid 等稳定信息生成机器码。
- 解析 `RTS-LIC-` 注册码。
- 使用内置公钥验签。
- 校验机器码、到期日、版本和功能权限。
- 激活后写入 `data/license.json`。

授权生成工具：

- [tools/license_core.py](../tools/license_core.py)：用私钥生成注册码。
- [tools/license_generator_gui.py](../tools/license_generator_gui.py)：Tkinter GUI。

详细逻辑见 [module_license_and_runtime.md](module_license_and_runtime.md)。

## 8. Windows 打包

Windows 打包入口：

```text
packaging\windows\build_windows.bat
```

核心脚本：

- [build_windows.bat](../packaging/windows/build_windows.bat)
- [build_windows.ps1](../packaging/windows/build_windows.ps1)
- [launcher.py](../packaging/windows/launcher.py)

打包脚本会：

1. 检查或构建 `frontend/dist`。
2. 选择 Python 3.11 或 3.12 正式版。
3. 安装后端依赖和 PyInstaller。
4. 使用 PyInstaller 打包 `RTS_Toolbox.exe`。
5. 使用 PyInstaller 打包 `RTS_License_Generator.exe`。

主程序打包的关键点：

- `--paths $Root`
- `--paths backend`
- `--add-data frontend/dist;frontend/dist`
- `--hidden-import license_service`
- `--hidden-import backend.license_service`
- `--hidden-import services.eclass...`
- `--hidden-import backend.services.eclass...`
- `--hidden-import legacy.eclass...`
- `--collect-all cryptography`

这些配置用于解决打包后动态 import 找不到模块的问题。

打包输出：

```text
dist\RTS_Toolbox.exe
dist\RTS_License_Generator.exe
```

运行时日志：

```text
%LOCALAPPDATA%\RTS_Toolbox\logs\runtime.log
%LOCALAPPDATA%\技术支持效率平台\logs\runtime.log
```

## 9. 开发运行方式

### 9.1 后端直接运行

```powershell
cd /d E:\MRCODE\RTSTool
python backend\main.py
```

浏览器访问：

```text
http://127.0.0.1:8000
```

如果端口被占用，后端会从 8000 起查找可用端口。

### 9.2 前端单独开发

```powershell
cd /d E:\MRCODE\RTSTool\frontend
npm install
npm run dev
```

浏览器访问 Vite 地址，通常是：

```text
http://127.0.0.1:5173
```

前端开发时需要后端同时运行，Vite 代理会把 `/api` 请求转发到后端。

### 9.3 生产前端构建

```powershell
cd /d E:\MRCODE\RTSTool\frontend
npm run build
```

构建产物在：

```text
frontend\dist
```

后端打包或直接运行时会托管该目录。

## 10. 新增模块建议

### 10.1 新增后端 Excel 计算模块

建议步骤：

1. 在 `frontend/src/tools` 新增工具页面。
2. 在 `frontend/src/services` 新增 API 封装。
3. 在 `App.vue` 注册工具组件和 `activeTool` 分支。
4. 在 `Sidebar.vue` 和 `HomeOverview.vue` 增加入口。
5. 在 `backend/main.py` 或独立 router 中新增处理接口。
6. 在 `license_service.py`、`licenseFeatures.js` 和 License Generator 中新增功能 key。
7. 在 `docs` 中新增模块维护文档。

### 10.2 新增前端本地解析模块

建议步骤：

1. 新增 parser，负责 Excel 字段识别和标准记录生成。
2. 新增 aggregator，负责筛选、统计、排名、地图点和图表数据。
3. 新增 export 工具。
4. 通过 `localDataStore.js` 缓存导入结果。
5. 将授权 key 接入前端路由拦截。

### 10.3 新增 E课堂业务方向

建议步骤：

1. 在 `backend/services/eclass/schemas.py` 增加上传 schema。
2. 新增 adapter，适配底层算法输入输出。
3. 在 `runner.py` 注册 adapter。
4. 如果有旧脚本，放入 `backend/legacy/eclass` 并减少对 GUI 路径的依赖。
5. 在 `packaging/windows/build_windows.ps1` 补 hidden import。
6. 更新 E课堂模块文档。

## 11. Git 与忽略规则

通常应该提交：

- 前端源码
- 后端源码
- 打包脚本
- 依赖清单
- 文档
- 必要静态资源

通常不应提交：

- `.venv/`
- `.build/`
- `dist/`
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/output/` 下的结果文件
- `__pycache__/`
- 用户上传的业务数据
- 本机授权状态文件 `data/license.json`

## 12. 当前维护重点

- `backend/main.py` 仍承载多个后端计算模块，后续继续扩展时建议逐步拆分 router 和 service。
- E课堂已经形成较清晰的 schema、runner、adapter 架构，新增 E课堂功能优先沿用这条线。
- 前端本地地图模块计算都在浏览器完成，大文件性能取决于用户电脑。
- 授权功能 key 在前端、后端和授权生成工具中都有映射，新增或改名时必须同步。
- PyInstaller 打包对动态 import 敏感，新增后端模块后要同步检查 hidden import。
