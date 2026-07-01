# 授权与运行时模块

## 模块定位

授权与运行时模块负责 Windows 环境下的机器码生成、注册码校验、功能权限控制、License Center 工具生成注册码，以及打包后的单文件应用运行。它不直接做业务数据计算，但决定用户能否打开和使用各业务模块。

- 后端授权服务：`backend/license_service.py`
- 后端授权接口：`backend/main.py`
- E课堂授权拦截：`backend/services/eclass/router.py`
- 前端授权中心：`frontend/src/tools/LicenseCenter.vue`
- 授权生成 GUI：`tools/license_generator_gui.py`
- 授权生成核心：`tools/license_core.py`
- Windows 打包脚本：`packaging/windows/build_windows.ps1`
- 启动器：`packaging/windows/launcher.py`

## 授权启用范围

当前逻辑中：

- Windows 平台启用注册码校验。
- 非 Windows 平台默认不启用注册码校验，返回所有功能可用。

判断函数：

- `is_license_required()`

## 功能权限

授权功能 key：

- `timeout_filter`：超时工单筛选
- `online_service_target`：在线服务项目目标
- `online_service_kpi`：在线服务考核指标
- `qualification_map`：中国区人员服务资质地图
- `training_map`：中国区培训覆盖地图
- `elearning_data`：E课堂数据处理
- `export_excel`：Excel 导出
- `export_pdf`：PDF 导出
- `ai_assistant`：AI 助手
- `admin`：管理员权限

如果授权包含 `admin` 且未过期，会自动拥有全部功能权限。

旧版没有 `features` 字段的授权默认只开放超时工单筛选，并提示建议更新授权。

## 机器码计算逻辑

Windows 优先使用稳定机器信息：

1. Windows `MachineGuid`
2. 计算机系统 UUID
3. BIOS 序列号
4. 主板序列号

通常以 `windows-stable-v2|MachineGuid` 生成机器码。机器码格式为：

```text
XXXX-XXXX-XXXX-XXXX
```

计算方式：

1. 将指纹字段用 `|` 拼接。
2. 对拼接字符串做 SHA-256。
3. 取前 16 位十六进制。
4. 每 4 位加一个短横线。

为了兼容历史授权，系统还会计算旧版指纹机器码，并在 `valid_machine_codes()` 中同时接受部分稳定字段组合。

## 注册码结构

注册码前缀：

```text
RTS-LIC-
```

注册码内容是 base64url 编码后的 JSON，包含：

- `payload`
- `signature`

payload 字段：

- `machine_code`
- `license_user`
- `department`
- `expire_date`
- `version`
- `features`
- `created_at`

签名逻辑：

- License Generator 使用私钥签名。
- 应用端只内置公钥。
- 签名算法使用 RSA PSS + SHA-256。
- 校验时对 payload 做稳定 JSON 序列化后验签。

## 激活与校验流程

### 激活

接口：`POST /api/license/activate`

流程：

1. 解析注册码。
2. 使用公钥验签。
3. 校验 payload 必需字段。
4. 校验机器码是否匹配当前设备。
5. 校验到期日期未过期。
6. 校验版本属于 `TRIAL`、`STANDARD`、`PRO`、`ENTERPRISE`。
7. 校验功能 key 均为已知功能。
8. 写入 `data/license.json`。

### 状态查询

接口：`GET /api/license/status`

返回：

- 是否启用授权
- 当前机器码
- 注册机器码
- 授权人
- 部门
- 到期日
- 版本
- 功能权限
- 剩余天数
- 授权状态
- 提示信息

授权状态包括：

- `inactive`：未激活
- `active`：有效
- `expired`：过期
- `mismatch`：机器码不匹配
- `invalid`：授权格式异常

### 功能校验

业务接口调用 `require_valid_license(feature)`：

1. 如果非 Windows，直接通过。
2. 读取 `data/license.json`。
3. 解析并验签注册码。
4. 校验机器码、日期、版本和功能权限。
5. 如果当前授权不包含该功能，返回 403。

E课堂处理接口额外校验：

- `/api/eclass/process` 需要 `elearning_data`。
- `/api/eclass/download` 需要 `elearning_data` 和 `export_excel`。
- `/api/eclass/open-output-folder` 需要 `elearning_data`。

## License Generator

授权生成工具是 Tkinter 桌面程序：

- 输入机器码、授权人、部门、到期日期、版本。
- 勾选功能权限。
- 生成注册码。
- 将授权记录写入 `data/license_records.json`。

核心生成逻辑在 `tools/license_core.py`：

- 校验机器码格式。
- 校验到期日期不早于当天。
- 校验至少选择一个功能权限。
- 用私钥签名 payload。
- 输出 `RTS-LIC-` 前缀注册码。

## 打包逻辑

Windows 打包脚本：

- 构建前端 `frontend/dist`。
- 选择 Python 3.11 或 3.12 正式版。
- 校验后端依赖，包括 `cryptography`、`fastapi`、`uvicorn`、`pandas`、`openpyxl`、`docx`、`matplotlib`、`PyInstaller`。
- 使用 PyInstaller 打包主程序。
- 使用 PyInstaller 打包授权生成器。

关键 PyInstaller 配置：

- `--paths $Root`
- `--paths backend`
- `--add-data frontend/dist;frontend/dist`
- `--hidden-import license_service`
- `--hidden-import backend.license_service`
- `--hidden-import services.eclass...`
- `--hidden-import backend.services.eclass...`
- `--hidden-import legacy.eclass...`
- `--hidden-import backend.legacy.eclass...`
- `--collect-all cryptography`

这些 hidden import 是为了解决打包后动态 import 找不到模块的问题，例如：

- `No module named 'license_service'`
- `No module named 'cryptography'`

## 业务价值

授权模块让工具可以按设备、有效期和功能模块进行分发控制。它支持给不同用户开放不同模块，降低未授权传播风险，也让后续新增模块时可以在同一套权限体系下开关功能。

## 维护注意点

- 应用端只应该保留公钥，私钥只用于授权生成工具。
- 修改功能 key 时要同时维护后端、前端授权展示和授权生成工具。
- 打包报缺模块时，优先检查 PyInstaller hidden import 和 `--collect-all`。
- `cryptography` 是授权验签必需依赖，授权生成器和主程序都要打进去。
- `data/license.json` 是本机激活状态文件，不应在版本控制中当作通用配置传播。
- Windows 机器码可能受系统重装或硬件信息变化影响，因此保留了多种兼容机器码。
