# E课堂数据处理公共框架

## 模块定位

E课堂数据处理是一个独立于 `backend/main.py` 主计算函数之外的子系统。它通过 FastAPI Router 接入后端，用 schema 描述不同产线和业务方向需要上传哪些文件，再由 runner 调度具体 adapter。当前已接入 IVD 大练兵和 IVD 交流会。

- 前端页面：`frontend/src/tools/EclassDataTool.vue`
- 文件夹上传组件：`frontend/src/components/DirectoryUploadCard.vue`
- 前端接口封装：`frontend/src/services/eclassService.js`
- 前端页面状态缓存：`frontend/src/services/eclassPageState.js`
- 后端路由：`backend/services/eclass/router.py`
- 上传 schema：`backend/services/eclass/schemas.py`
- 调度器：`backend/services/eclass/runner.py`
- 文件工具：`backend/services/eclass/file_utils.py`

## 当前支持范围

产线：

- `IVD`：已启用。
- `PLMS`：待开发。
- `MIS`：待开发。

业务方向：

- `big_teach`：大练兵。
- `communication`：交流会。

启用组合：

- `IVD + big_teach`
- `IVD + communication`

## 前端交互逻辑

### 1. 产线和业务方向

前端启动 E课堂页面后会调用：

- `GET /api/eclass/options`
- `GET /api/eclass/upload-schema?product_line=IVD&module=big_teach`

schema 返回当前组合是否启用、页面说明、上传槽位和每个槽位的文件类型要求。

### 2. 文件夹上传

文件夹槽位使用 `webkitdirectory` 上传，前端会同时提交：

- `{slot}_files`：文件列表。
- `{slot}_paths`：文件在原文件夹中的相对路径列表。

后端会根据这些相对路径重建安全的临时目录结构。

### 3. 按组合缓存页面状态

`eclassPageState.js` 用 `productLine::moduleKey` 保存不同组合的页面状态。这样从交流会切到大练兵，再切回交流会时，之前上传的文件、识别结果、输出文件夹和预览不会被另一个组合覆盖。

保存内容包括：

- 当前 schema
- 每个上传槽位的文件
- 上传控件版本号
- 进度
- 结果状态和提示
- 输出列表
- 输出文件夹
- 打开输出文件夹 URL
- 预览表格

## 后端处理流程

### 1. 路由层

`backend/services/eclass/router.py` 提供：

- `GET /api/eclass/options`：返回产线和业务方向选项。
- `GET /api/eclass/upload-schema`：返回当前组合上传 schema。
- `POST /api/eclass/process`：处理上传文件。
- `GET /api/eclass/download/{job_id}/{file_id}`：下载结果文件。
- `POST /api/eclass/open-output-folder/{job_id}`：打开输出文件夹。

处理和下载会先校验授权：

- 处理需要 `ELEARNING_DATA` 权限。
- 下载还需要 `EXPORT_EXCEL` 权限。

### 2. 调度层

`process_eclass_job` 的流程：

1. 校验产线和业务方向是否启用。
2. 根据组合解析 adapter：
   - `IVD + big_teach` 调用 `ivd_big_teach_adapter.run`
   - `IVD + communication` 调用 `ivd_communication_adapter.run`
3. 创建本次任务临时目录。
4. 创建最终结果目录。
5. 保存上传文件。
6. 调用 adapter 生成结果。
7. 将 adapter 输出从任务临时目录发布到最终结果目录。
8. 写 manifest。
9. 生成预览数据。
10. 返回 job_id、输出列表、输出文件夹、预览、日志和 warning。

### 3. 任务目录

开发环境：

- 根目录：`backend/output/eclass/{job_id}`
- 输入目录：`backend/output/eclass/{job_id}/input`
- 计算输出临时目录：`backend/output/eclass/{job_id}/output`

打包后：

- 根目录：`%LOCALAPPDATA%/技术支持效率平台/output/eclass/{job_id}`
- 输入目录：`input`
- 计算输出临时目录：`output`

### 4. 最终结果目录

最终用户看到的输出目录位于下载目录：

- IVD 大练兵：`C:\Users\{用户名}\Downloads\IVD大练兵数据统计结果`
- IVD 交流会：`C:\Users\{用户名}\Downloads\IVD交流会数据统计结果`

如果用户系统没有 Downloads 目录，则回退到 E课堂输出根目录下的 `results`。

### 5. 发布结果文件

adapter 先在任务临时输出目录生成文件，runner 再调用 `publish_result_file` 复制到最终结果目录。

发布策略：

- 优先使用固定文件名覆盖同名旧文件。
- 如果同名文件被占用，会重试 3 次。
- 仍被占用时，使用时间戳文件名兜底，避免整体处理失败。

这个策略解决了用户没有打开文件但旧结果仍被 Excel 或系统短暂占用时再次处理失败的问题。

### 6. manifest

manifest 记录：

- job_id
- 输出目录
- 输出文件 file_id
- 文件名
- 文件类型
- 相对路径名

下载和打开输出文件夹都基于 manifest 找到结果目录。

## 上传安全逻辑

后端保存上传文件时会做这些保护：

- 只允许 `.xlsx`、`.xls`、`.xlsm`、`.csv`、`.docx`、图片等白名单后缀。
- 每个槽位还会校验 schema 中的 accept 后缀。
- 文件夹上传不允许绝对路径、盘符路径和 `..` 路径穿越。
- 文件名会移除 Windows 非法字符。
- 忽略 `~$` 开头的 Office 临时文件。
- 文件夹上传中非当前槽位格式的文件会被忽略并记录 warning。

## 业务价值

E课堂公共框架把“上传配置、文件保存、任务隔离、结果发布、预览和打开文件夹”从具体业务算法中抽出来。后续新增 PLMS 或 MIS 时，不需要重写文件上传和结果管理，只要补 schema 和 adapter，就能接入同一套页面和后端流程。

## 维护注意点

- 新增业务方向时，优先改 `schemas.py` 和 `_resolve_adapter`。
- 每个 adapter 只应该关心输入路径和输出路径，不应该处理 HTTP、manifest 或打开文件夹。
- 如果修改结果目录命名，维护 `MODULE_FOLDER_LABELS` 和 `eclass_result_folder_name`。
- 如果继续支持文件夹上传，必须保留相对路径校验，避免路径穿越。
- 如果输出预览异常，优先检查 `backend/services/eclass/preview.py` 是否正确关闭 Excel 文件句柄。
- 打包后 import 路径可能变成顶层路径，所以 E课堂代码里保留了 `services...` 和 `backend.services...` 两套 import fallback。
