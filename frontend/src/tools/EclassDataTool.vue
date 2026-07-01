<template>
  <div class="tool-page eclass-page">
    <ToolHeader
      :icon="GraduationCap"
      kicker="E-LEARNING DATA PROCESSING"
      title="E课堂数据处理"
      description="用于处理各产线大练兵、交流会数据，自动生成统计结果和分析文件。"
    />

    <section class="glass-panel eclass-selector-panel">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Processing Scope</p>
          <h2>产线与业务方向</h2>
        </div>
        <span class="format-chip">{{ schema.enabled ? '可处理' : '待开发' }}</span>
      </div>

      <div class="eclass-choice-layout">
        <div class="eclass-choice-group">
          <span class="eclass-choice-label">大产线</span>
          <div class="eclass-choice-grid">
            <button
              v-for="line in options.product_lines"
              :key="line.key"
              class="eclass-choice-card"
              :class="{ active: productLine === line.key, disabled: !line.enabled }"
              type="button"
              :disabled="isProcessing"
              @click="selectProductLine(line.key)"
            >
              <span>{{ line.label }}</span>
              <small>{{ line.enabled ? '已接入' : line.message || '待开发' }}</small>
            </button>
          </div>
        </div>

        <div class="eclass-choice-group">
          <span class="eclass-choice-label">业务方向</span>
          <div class="eclass-choice-grid">
            <button
              v-for="moduleItem in options.modules"
              :key="moduleItem.key"
              class="eclass-choice-card"
              :class="{ active: moduleKey === moduleItem.key }"
              type="button"
              :disabled="isProcessing"
              @click="selectModule(moduleItem.key)"
            >
              <span>{{ moduleItem.label }}</span>
              <small>{{ isCombinationEnabled(productLine, moduleItem.key) ? '可运行' : '待开发' }}</small>
            </button>
          </div>
        </div>
      </div>

      <div class="result-band" :class="schema.enabled ? 'success' : 'idle'">
        <CircleCheck v-if="schema.enabled" :size="21" />
        <Clock3 v-else :size="21" />
        <span>{{ schema.description || schema.message || '当前组合暂未接入底层逻辑' }}</span>
      </div>
    </section>

    <section class="glass-panel upload-section">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">File Intake</p>
          <h2>{{ schema.title || '文件上传' }}</h2>
        </div>
        <span class="format-chip">xlsx / docx</span>
      </div>

      <template v-if="schema.enabled">
        <div class="upload-grid eclass-upload-grid">
          <DirectoryUploadCard
            v-for="slot in folderUploadSlots"
            :key="slotInputKey(slot.key)"
            :files="slotFiles(slot.key)"
            :title="slot.label"
            :description="slot.description"
            :accept="slot.accept"
            :required="slot.required"
            :disabled="isProcessing"
            @change="setSlotFiles(slot.key, $event)"
            @clear="clearSlot(slot.key)"
          />
          <label
            v-for="slot in fileUploadSlots"
            :key="slotInputKey(slot.key)"
            class="upload-card eclass-upload-card"
            :class="{ ready: slotFiles(slot.key).length, disabled: isProcessing }"
          >
            <input
              :key="slotInputKey(slot.key)"
              type="file"
              :accept="slot.accept"
              :multiple="slot.multiple"
              :disabled="isProcessing"
              @change="setSlotFiles(slot.key, $event.target.files)"
            />
            <span class="upload-check" aria-hidden="true">
              <CheckCircle2 v-if="slotFiles(slot.key).length" :size="20" />
              <UploadCloud v-else :size="20" />
            </span>
            <component :is="slot.accept === '.docx' ? FileText : FileSpreadsheet" class="upload-main-icon" :size="36" />
            <strong>{{ slot.label }}<em v-if="slot.required">*</em></strong>
            <span class="upload-desc">{{ slot.description }}</span>
            <span class="upload-filename">{{ slotFileText(slot) }}</span>
            <button
              v-if="slotFiles(slot.key).length"
              class="eclass-clear-button"
              type="button"
              :disabled="isProcessing"
              @click.prevent.stop="clearSlot(slot.key)"
            >
              清除
            </button>
          </label>
        </div>

        <div v-if="communicationDetectPreview" class="eclass-detect-panel">
          <div class="eclass-detect-head">
            <div>
              <p class="section-kicker">Auto Detection</p>
              <h3>交流会六科自动识别结果</h3>
            </div>
            <span class="format-chip">{{ communicationDetectPreview.readyCount }}/6 已识别</span>
          </div>
          <div class="eclass-detect-rules">
            <span v-for="rule in communicationDetectPreview.rules" :key="rule">{{ rule }}</span>
          </div>
          <div class="eclass-detect-grid">
            <div
              v-for="item in communicationDetectPreview.results"
              :key="item.subject"
              class="eclass-detect-row"
              :class="{ ready: item.found, missing: !item.found }"
            >
              <CircleCheck v-if="item.found" :size="18" />
              <AlertCircle v-else :size="18" />
              <strong>{{ item.label }}</strong>
              <span>{{ item.found ? `已识别 ${item.fileName}` : '未识别到' }}</span>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="empty-preview eclass-pending-panel">
        <Construction :size="26" />
        <span>{{ schema.message || '当前产线或业务方向待开发' }}</span>
      </div>
    </section>

    <ActionPanel
      :can-process="canProcess"
      :can-download="Boolean(openFolderUrl)"
      :is-processing="isProcessing"
      :is-download-busy="activeOperationKey === 'open-folder'"
      :progress="progress"
      :result-state="resultState"
      :message="resultMessage"
      :status-text="statusText"
      process-label="开始处理"
      processing-label="处理中"
      download-label="打开输出文件夹"
      :download-locked="false"
      @process="processFiles"
      @download="openOutputFolder"
      @locked-download="emit('feature-blocked', 'Excel导出')"
    />

    <section v-if="outputs.length" class="glass-panel eclass-output-panel">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Output Files</p>
          <h2>输出文件</h2>
        </div>
        <span class="preview-count">{{ outputs.length }} 个文件</span>
      </div>
      <div class="eclass-output-list">
        <article v-for="output in outputs" :key="output.file_id" class="eclass-output-item">
          <FileDown :size="20" />
          <div>
            <strong>{{ output.filename }}</strong>
            <span>{{ output.type || '结果文件' }}</span>
          </div>
          <button
            class="ghost-button compact"
            type="button"
            :disabled="!props.canExportExcel || Boolean(activeOperationKey)"
            @click="downloadOutput(output)"
          >
            <LoaderCircle v-if="activeOperationKey === output.file_id" class="spin" :size="16" />
            <Download v-else :size="16" />
            <span>下载</span>
          </button>
        </article>
      </div>
    </section>

    <PreviewTable
      :preview="preview"
      empty-text="处理完成后展示主要结果表前 10 行。"
    />
    <BlockingOperationModal
      :visible="operationFeedback.visible"
      :title="operationFeedback.title"
      :message="operationFeedback.message"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from 'vue';
import {
  AlertCircle,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Construction,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LoaderCircle,
  UploadCloud
} from 'lucide-vue-next';
import ActionPanel from '../components/ActionPanel.vue';
import BlockingOperationModal from '../components/BlockingOperationModal.vue';
import DirectoryUploadCard from '../components/DirectoryUploadCard.vue';
import PreviewTable from '../components/PreviewTable.vue';
import ToolHeader from '../components/ToolHeader.vue';
import {
  downloadEclassResult,
  getEclassOptions,
  getEclassUploadSchema,
  openEclassOutputFolder,
  processEclassData
} from '../services/eclassService';
import {
  defaultEclassSchema,
  eclassPageState,
  getEclassCombinationState,
  setEclassCombinationState
} from '../services/eclassPageState';
import {
  completeProcessTask,
  createEclassTaskKey,
  failProcessTask,
  getProcessTask,
  resetProcessTask,
  startProcessTask,
  updateProcessTask
} from '../services/processTaskStore';
import { runWithMinimumVisibleTime } from '../utils/blockingOperation';

const props = defineProps({
  canExportExcel: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-change', 'log', 'feature-blocked']);

const fallbackOptions = {
  product_lines: [
    { key: 'IVD', label: 'IVD', enabled: true },
    { key: 'PLMS', label: 'PLMS', enabled: false, message: '待开发' },
    { key: 'MIS', label: 'MIS', enabled: false, message: '待开发' }
  ],
  modules: [
    { key: 'big_teach', label: '大练兵' },
    { key: 'communication', label: '交流会' }
  ],
  enabled_combinations: [
    { product_line: 'IVD', module: 'big_teach' },
    { product_line: 'IVD', module: 'communication' }
  ]
};

const initialCombinationState = getEclassCombinationState(eclassPageState.productLine, eclassPageState.moduleKey);
const restoredFromMemory = Boolean(initialCombinationState);
const options = ref(eclassPageState.options || fallbackOptions);
const productLine = ref(eclassPageState.productLine || 'IVD');
const moduleKey = ref(eclassPageState.moduleKey || 'big_teach');
const schema = ref(initialCombinationState?.schema || defaultEclassSchema);
const filesBySlot = reactive({ ...(initialCombinationState?.filesBySlot || {}) });
const inputVersions = reactive({ ...(initialCombinationState?.inputVersions || {}) });
const progress = ref(initialCombinationState?.progress || 0);
const resultState = ref(initialCombinationState?.resultState || 'idle');
const resultMessage = ref(initialCombinationState?.resultMessage || '等待上传文件');
const preview = ref(initialCombinationState?.preview || null);
const outputs = ref(initialCombinationState?.outputs || []);
const outputFolder = ref(initialCombinationState?.outputFolder || '');
const openFolderUrl = ref(initialCombinationState?.openFolderUrl || '');
const activeOperationKey = ref('');
const operationFeedback = reactive({
  visible: false,
  title: '',
  message: ''
});

const currentProcessTask = computed(() => getProcessTask(currentEclassTaskKey()));
const isProcessing = computed(() => currentProcessTask.value.status === 'processing');

const folderUploadSlots = computed(() => (
  (schema.value.upload_slots || []).filter((slot) => slot.input_type === 'folder')
));

const fileUploadSlots = computed(() => (
  (schema.value.upload_slots || []).filter((slot) => slot.input_type !== 'folder')
));

const missingRequiredSlots = computed(() => {
  if (!schema.value.enabled) return schema.value.upload_slots || [];
  return (schema.value.upload_slots || []).filter((slot) => slot.required && !slotFiles(slot.key).length);
});

const canProcess = computed(() => (
  schema.value.enabled &&
  !isProcessing.value &&
  missingRequiredSlots.value.length === 0
));

const statusText = computed(() => {
  if (isProcessing.value) return '正在处理 E课堂数据';
  if (!schema.value.enabled) return '待开发';
  if (openFolderUrl.value) return '处理完成，可打开输出文件夹';
  if (missingRequiredSlots.value.length) return `待上传 ${missingRequiredSlots.value.length} 个必传项目`;
  return '待处理';
});

const communicationSubjects = [
  { subject: '凝血', label: '凝血成绩' },
  { subject: '化免', label: '化免成绩' },
  { subject: '临检', label: '临检成绩' },
  { subject: 'TLA', label: 'TLA成绩' },
  { subject: '微生物', label: '微生物成绩' },
  { subject: '尿液', label: '尿液成绩' }
];

const communicationDetectPreview = computed(() => {
  if (productLine.value !== 'IVD' || moduleKey.value !== 'communication') return null;
  const files = slotFiles('data_folder');
  if (!files.length) return null;
  const candidates = files.filter(isCommunicationCandidate);
  const results = communicationSubjects.map((item) => {
    const matched = candidates
      .filter((file) => filenameContainsSubject(file.name, item.subject))
      .sort(compareCommunicationFiles);
    return {
      ...item,
      found: matched.length > 0,
      fileName: matched[0]?.name || '',
      candidateCount: matched.length
    };
  });
  return {
    rules: [
      '不再读取 名单.xlsx',
      '只扫描数据文件夹当前层级',
      '文件名包含科目名即可',
      '同科目多文件按日期/时间戳选择最新'
    ],
    readyCount: results.filter((item) => item.found).length,
    results
  };
});

watchEffect(() => {
  emit('status-change', statusText.value);
});

watchEffect(() => {
  applyProcessTaskState(currentProcessTask.value);
});

onMounted(async () => {
  await loadOptions();
  if (!restoredFromMemory) {
    await loadSchema();
  }
});

onBeforeUnmount(() => {
  saveMemoryState();
});

function isCombinationEnabled(line, moduleName) {
  return (options.value.enabled_combinations || []).some((item) => (
    item.product_line === line && item.module === moduleName
  ));
}

async function loadOptions() {
  try {
    options.value = await getEclassOptions();
  } catch (error) {
    emit('log', error.message || 'E课堂配置读取失败，使用本地默认配置');
  }
}

async function loadSchema() {
  resetResult();
  clearAllSlots();
  try {
    schema.value = await getEclassUploadSchema(productLine.value, moduleKey.value);
    resultMessage.value = schema.value.enabled
      ? '等待上传文件'
      : schema.value.message || '当前组合待开发';
  } catch (error) {
    schema.value = {
      enabled: false,
      title: '上传模板读取失败',
      description: '',
      message: error.message || '上传模板读取失败',
      upload_slots: []
    };
    resultState.value = 'error';
    resultMessage.value = schema.value.message;
  }
}

function applyFilesState(nextFilesBySlot = {}) {
  Object.keys(filesBySlot).forEach((key) => {
    delete filesBySlot[key];
  });
  Object.entries(nextFilesBySlot).forEach(([key, files]) => {
    filesBySlot[key] = Array.from(files || []);
  });
}

function applyInputVersionsState(nextInputVersions = {}) {
  Object.keys(inputVersions).forEach((key) => {
    delete inputVersions[key];
  });
  Object.assign(inputVersions, nextInputVersions || {});
}

function restoreCombinationState(state) {
  schema.value = state?.schema || defaultEclassSchema;
  applyFilesState(state?.filesBySlot || {});
  applyInputVersionsState(state?.inputVersions || {});
  progress.value = state?.progress || 0;
  resultState.value = state?.resultState || 'idle';
  resultMessage.value = state?.resultMessage || (schema.value.enabled ? '等待执行处理' : schema.value.message || '当前组合待开发');
  preview.value = state?.preview || null;
  outputs.value = state?.outputs || [];
  outputFolder.value = state?.outputFolder || '';
  openFolderUrl.value = state?.openFolderUrl || '';
}

async function switchCombination(nextProductLine, nextModuleKey) {
  const normalizedProductLine = String(nextProductLine || '').trim().toUpperCase();
  const normalizedModuleKey = String(nextModuleKey || '').trim();
  if (normalizedProductLine === productLine.value && normalizedModuleKey === moduleKey.value) {
    return;
  }

  saveMemoryState();
  productLine.value = normalizedProductLine;
  moduleKey.value = normalizedModuleKey;
  eclassPageState.productLine = normalizedProductLine;
  eclassPageState.moduleKey = normalizedModuleKey;

  const savedState = getEclassCombinationState(normalizedProductLine, normalizedModuleKey);
  if (savedState) {
    restoreCombinationState(savedState);
    return;
  }

  restoreCombinationState({
    schema: defaultEclassSchema,
    resultMessage: '正在读取上传模板...'
  });
  await loadSchema();
  saveMemoryState();
}

async function selectProductLine(lineKey) {
  await switchCombination(lineKey, moduleKey.value);
}

async function selectModule(nextModuleKey) {
  await switchCombination(productLine.value, nextModuleKey);
}

function slotFiles(slotKey) {
  return filesBySlot[slotKey] || [];
}

function setSlotFiles(slotKey, fileList) {
  filesBySlot[slotKey] = Array.from(fileList || []);
  resetResult();
  if (filesBySlot[slotKey].length) {
    emit('log', `已选择 ${filesBySlot[slotKey].length} 个 E课堂文件`);
  }
}

function clearSlot(slotKey) {
  filesBySlot[slotKey] = [];
  inputVersions[slotKey] = (inputVersions[slotKey] || 0) + 1;
  resetResult();
}

function clearAllSlots() {
  Object.keys(filesBySlot).forEach((key) => {
    delete filesBySlot[key];
  });
}

function slotFileText(slot) {
  const files = slotFiles(slot.key);
  if (!files.length) return slot.multiple ? `支持多选：${slot.accept}` : `支持格式：${slot.accept}`;
  if (files.length === 1) return files[0].name;
  return `${files.length} 个文件：${files[0].name}`;
}

function slotInputKey(slotKey) {
  return `${slotKey}-${inputVersions[slotKey] || 0}`;
}

function currentEclassTaskKey() {
  return createEclassTaskKey(productLine.value, moduleKey.value);
}

function cloneFilesBySlot() {
  return Object.fromEntries(
    Object.entries(filesBySlot).map(([key, files]) => [key, Array.from(files || [])])
  );
}

function applyProcessTaskState(task) {
  if (!task || task.status === 'idle') return;
  const inputs = task.inputs || {};
  if (
    inputs.productLine &&
    inputs.moduleKey &&
    (inputs.productLine !== productLine.value || inputs.moduleKey !== moduleKey.value)
  ) {
    return;
  }

  if (task.schema || inputs.schema) {
    schema.value = task.schema || inputs.schema;
  }
  if (inputs.filesBySlot) {
    applyFilesState(inputs.filesBySlot);
  }
  if (inputs.inputVersions) {
    applyInputVersionsState(inputs.inputVersions);
  }
  progress.value = task.progress || 0;
  resultState.value = task.resultState || 'idle';
  resultMessage.value = task.message || (schema.value.enabled ? '等待执行处理' : schema.value.message || '当前组合待开发');
  preview.value = task.preview || null;
  outputs.value = task.outputs || [];
  outputFolder.value = task.outputFolder || '';
  openFolderUrl.value = task.openFolderUrl || '';
}

function resetResult() {
  resetProcessTask(currentEclassTaskKey(), {
    message: schema.value.enabled ? '等待执行处理' : schema.value.message || '当前组合待开发'
  });
  progress.value = 0;
  resultState.value = 'idle';
  resultMessage.value = schema.value.enabled ? '等待执行处理' : schema.value.message || '当前组合待开发';
  preview.value = null;
  outputs.value = [];
  outputFolder.value = '';
  openFolderUrl.value = '';
}

function saveMemoryState() {
  eclassPageState.initialized = true;
  eclassPageState.options = options.value;
  eclassPageState.productLine = productLine.value;
  eclassPageState.moduleKey = moduleKey.value;
  setEclassCombinationState(productLine.value, moduleKey.value, {
    schema: schema.value,
    filesBySlot: Object.fromEntries(
      Object.entries(filesBySlot).map(([key, files]) => [key, Array.from(files || [])])
    ),
    inputVersions: { ...inputVersions },
    progress: progress.value,
    resultState: resultState.value,
    resultMessage: resultMessage.value,
    preview: preview.value,
    outputs: outputs.value,
    outputFolder: outputFolder.value,
    openFolderUrl: openFolderUrl.value
  });
}

async function processFiles() {
  if (!canProcess.value) return;

  const taskKey = currentEclassTaskKey();
  const taskInputs = {
    productLine: productLine.value,
    moduleKey: moduleKey.value,
    schema: schema.value,
    filesBySlot: cloneFilesBySlot(),
    inputVersions: { ...inputVersions }
  };
  startProcessTask(taskKey, {
    progress: 8,
    message: '正在上传文件',
    schema: schema.value,
    preview: null,
    outputs: [],
    outputFolder: '',
    openFolderUrl: '',
    inputs: taskInputs
  });
  applyProcessTaskState(getProcessTask(taskKey));
  saveMemoryState();
  emit('log', `开始处理 ${schema.value.title}`);

  try {
    const payload = await processEclassData({
      productLine: productLine.value,
      moduleKey: moduleKey.value,
      uploadSlots: schema.value.upload_slots || [],
      filesBySlot,
      onUploadProgress: (uploadProgress) => {
        updateProcessTask(taskKey, { progress: Math.max(8, uploadProgress) });
      },
      onHeadersReceived: () => {
        updateProcessTask(taskKey, {
          progress: Math.max(getProcessTask(taskKey).progress, 68),
          message: '后端正在解析并生成结果文件'
        });
      }
    });

    completeProcessTask(taskKey, {
      message: payload.message || '处理完成',
      preview: payload.preview || null,
      outputs: payload.outputs || [],
      outputFolder: payload.output_folder || '',
      openFolderUrl: payload.open_folder_url || '',
      schema: schema.value,
      inputs: taskInputs
    });
    applyProcessTaskState(getProcessTask(taskKey));
    saveMemoryState();
    (payload.logs || []).slice(-3).forEach((message) => emit('log', message));
    if (getProcessTask(taskKey).outputFolder) {
      emit('log', `结果已生成到：${getProcessTask(taskKey).outputFolder}`);
    }
  } catch (error) {
    const message = error.message || 'E课堂处理失败，请检查上传文件';
    failProcessTask(taskKey, message, {
      schema: schema.value,
      inputs: taskInputs
    });
    applyProcessTaskState(getProcessTask(taskKey));
    saveMemoryState();
    emit('log', message);
  }
}

async function runBlockingOperation(key, title, message, action, minimumVisibleMs = 900) {
  if (activeOperationKey.value) return;
  activeOperationKey.value = key;
  operationFeedback.visible = true;
  operationFeedback.title = title;
  operationFeedback.message = message;
  try {
    await runWithMinimumVisibleTime(action, minimumVisibleMs);
  } catch (error) {
    emit('log', error.message || '当前操作失败');
  } finally {
    operationFeedback.visible = false;
    activeOperationKey.value = '';
  }
}

async function downloadOutput(output) {
  if (!props.canExportExcel) {
    emit('feature-blocked', 'Excel导出');
    return;
  }
  if (!output?.download_url || activeOperationKey.value) return;
  await runBlockingOperation(
    output.file_id,
    '正在下载结果文件',
    `系统正在准备 ${output.filename || '结果文件'}，请不要重复点击下载按钮。`,
    async () => {
      await downloadEclassResult(output.download_url, output.filename);
      emit('log', `已触发下载：${output.filename}`);
    }
  );
}

async function openOutputFolder() {
  if (!openFolderUrl.value || activeOperationKey.value) return;
  await runBlockingOperation(
    'open-folder',
    '正在打开输出文件夹',
    '系统正在请求本机打开结果目录，请不要重复点击按钮。',
    async () => {
      try {
        const payload = await openEclassOutputFolder(openFolderUrl.value);
        emit('log', `已打开输出文件夹：${payload.output_folder || outputFolder.value}`);
      } catch (error) {
        emit('log', error.message || '打开输出文件夹失败');
      }
    },
    700
  );
}

function relativePath(file) {
  return file?.webkitRelativePath || file?.name || '';
}

function isTopLevelFolderFile(file) {
  const parts = relativePath(file).split(/[\\/]/).filter(Boolean);
  return parts.length <= 2;
}

function fileSuffix(filename) {
  const match = String(filename || '').toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function isCommunicationCandidate(file) {
  return (
    isTopLevelFolderFile(file) &&
    !String(file.name || '').startsWith('~$') &&
    ['.xlsx', '.xls'].includes(fileSuffix(file.name))
  );
}

function filenameContainsSubject(filename, subject) {
  if (subject.toUpperCase() === 'TLA') return String(filename || '').toUpperCase().includes('TLA');
  return String(filename || '').includes(subject);
}

function extractDateForSort(filename) {
  const text = String(filename || '');
  const patterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})_(\d{1,2})_(\d{1,2})/,
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
    /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  const monthMatch = text.match(/(\d{4})年\s*(\d{1,2})月/);
  if (monthMatch) return `${monthMatch[1]}-${monthMatch[2].padStart(2, '0')}-01`;
  return '';
}

function extractTimestampForSort(filename) {
  const stem = String(filename || '').replace(/\.[^.]+$/, '');
  const endMatch = stem.match(/(\d{14})$/);
  if (endMatch) return endMatch[1];
  const matches = stem.match(/\d{14}/g);
  return matches?.at(-1) || '';
}

function communicationSortTuple(file) {
  return [
    extractDateForSort(file.name),
    extractTimestampForSort(file.name),
    Number(file.lastModified || 0),
    file.name
  ];
}

function compareCommunicationFiles(a, b) {
  const left = communicationSortTuple(a);
  const right = communicationSortTuple(b);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] > right[index]) return -1;
    if (left[index] < right[index]) return 1;
  }
  return 0;
}
</script>
