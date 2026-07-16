<template>
  <div v-if="!licenseReady" class="boot-screen">
    <div class="glass-panel boot-card">
      <img class="boot-logo" :src="brandConfig.logoMark" :alt="brandConfig.appShortName" />
      <p class="section-kicker">License Check</p>
      <h2>正在校验程序授权</h2>
      <p>{{ licenseBootMessage }}</p>
    </div>
  </div>

  <LicenseActivationView
    v-else-if="licenseRequired && !licenseAuthorized"
    :status-info="licenseStatusInfo"
    @activated="handleLicenseActivated"
    @refresh-status="fetchLicenseStatus"
  />

  <LoginView v-else-if="!isAuthenticated" @login-success="handleLoginSuccess" />

  <div v-else class="app-shell" :class="{ 'browser-fullscreen-mode': isBrowserFullscreen }">
    <Sidebar
      v-if="!isBrowserFullscreen"
      :collapsed="sidebarCollapsed"
      :active-tool="activeTool"
      :license-info="licenseStatusInfo"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @select="selectTool"
      @show-disclaimer="openDisclaimer('view')"
    />

    <div class="app-frame">
      <TopBar
        v-if="!isBrowserFullscreen"
        :license-info="licenseStatusInfo"
        @show-disclaimer="openDisclaimer('view')"
        @show-license-center="selectTool('license-center')"
      />

      <main class="main-content" :class="{ 'browser-fullscreen-content': isBrowserFullscreen }">
        <UnauthorizedState
          v-if="routeBlocked"
          :feature-name="activeToolName"
          :machine-code="licenseStatusInfo.machine_code"
          :expired="licenseExpired"
          @back-home="activeTool = 'home'"
          @open-license-center="selectTool('license-center')"
        />
        <LicenseCenter
          v-else-if="activeTool === 'license-center'"
          :license-info="licenseStatusInfo"
          @refresh-license="fetchLicenseStatus"
          @activated="handleLicenseActivated"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <AboutPlatform
          v-else-if="activeTool === 'about-platform'"
          @status-change="handleStatusChange"
        />
        <TimeoutTicketTool
          v-else-if="activeTool === 'timeout-ticket-filter'"
          :can-export-excel="canExportExcel"
          @feature-blocked="showUnauthorizedFeature"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <OnlineBusinessTool
          v-else-if="activeTool === 'online-business-calculation'"
          :can-export-excel="canExportExcel"
          @feature-blocked="showUnauthorizedFeature"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <OnlineAssessmentTool
          v-else-if="activeTool === 'online-service-assessment'"
          :can-export-excel="canExportExcel"
          @feature-blocked="showUnauthorizedFeature"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <EclassDataTool
          v-else-if="activeTool === 'eclass-data'"
          :can-export-excel="canExportExcel"
          @feature-blocked="showUnauthorizedFeature"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <div v-else-if="activeTool === 'service-qualification-map'" class="cached-tool-placeholder"></div>
        <div v-else-if="activeTool === 'training-coverage-map'" class="cached-tool-placeholder"></div>
        <HomeOverview
          v-else-if="activeTool === 'home'"
          :license-info="licenseStatusInfo"
          @select-tool="selectTool"
          @status-change="handleStatusChange"
        />
        <ToolPlaceholder
          v-else
          :tool-key="activeTool"
          @status-change="handleStatusChange"
        />
        <ServiceQualificationMap
          v-if="serviceQualificationMapMounted"
          v-show="!routeBlocked && activeTool === 'service-qualification-map'"
          :active="!routeBlocked && activeTool === 'service-qualification-map'"
          :can-export-excel="canExportExcel"
          :fullscreen-active="isBrowserFullscreen && activeTool === 'service-qualification-map'"
          @enter-fullscreen="enterBrowserFullscreen"
          @exit-fullscreen="exitBrowserFullscreen"
          @feature-blocked="showUnauthorizedFeature"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <TrainingCenterMap
          v-if="trainingMapMounted"
          v-show="!routeBlocked && activeTool === 'training-coverage-map'"
          :active="!routeBlocked && activeTool === 'training-coverage-map'"
          :can-export-excel="canExportExcel"
          :fullscreen-active="isBrowserFullscreen && activeTool === 'training-coverage-map'"
          @enter-fullscreen="enterBrowserFullscreen"
          @exit-fullscreen="exitBrowserFullscreen"
          @feature-blocked="showUnauthorizedFeature"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
      </main>

      <StatusBar
        v-if="!isBrowserFullscreen"
        :status="runtimeStatus"
        :logs="logs"
        :version="brandConfig.version"
      />
    </div>
  </div>

  <SecurityDisclaimerModal
    :visible="disclaimerVisible"
    :mode="disclaimerMode"
    @agree="handleDisclaimerAgree"
    @cancel="disclaimerVisible = false"
  />

  <UnauthorizedModal
    :visible="unauthorizedModal.visible"
    :feature-name="unauthorizedModal.featureName"
    :machine-code="licenseStatusInfo.machine_code"
    @close="unauthorizedModal.visible = false"
    @open-license-center="openLicenseCenterFromModal"
  />

  <Transition name="disclaimer-fade">
    <div v-if="fullscreenMessage" class="fullscreen-message-toast">
      <div>
        <strong>无法进入浏览器全屏</strong>
        <span>{{ fullscreenMessage }}</span>
      </div>
      <button type="button" @click="fullscreenMessage = ''">关闭</button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import LoginView from './components/LoginView.vue';
import LicenseActivationView from './components/LicenseActivationView.vue';
import SecurityDisclaimerModal from './components/SecurityDisclaimerModal.vue';
import Sidebar from './components/Sidebar.vue';
import StatusBar from './components/StatusBar.vue';
import ToolPlaceholder from './components/ToolPlaceholder.vue';
import TopBar from './components/TopBar.vue';
import UnauthorizedModal from './components/UnauthorizedModal.vue';
import UnauthorizedState from './components/UnauthorizedState.vue';
import AboutPlatform from './tools/AboutPlatform.vue';
import EclassDataTool from './tools/EclassDataTool.vue';
import HomeOverview from './tools/HomeOverview.vue';
import LicenseCenter from './tools/LicenseCenter.vue';
import OnlineAssessmentTool from './tools/OnlineAssessmentTool.vue';
import OnlineBusinessTool from './tools/OnlineBusinessTool.vue';
import ServiceQualificationMap from './tools/ServiceQualificationMap.vue';
import TrainingCenterMap from './tools/TrainingCenterMap.vue';
import TimeoutTicketTool from './tools/TimeoutTicketTool.vue';
import { brandConfig } from './config/brandConfig';
import { FEATURES, hasFeature, hasToolAccess, isLicenseExpired, toolFeatureLabel } from './utils/licenseFeatures';

const DISCLAIMER_STORAGE_KEY = 'rts_toolbox_disclaimer_agreed';
const DISCLAIMER_VERSION = '1.0';

const sidebarCollapsed = ref(false);
const activeTool = ref('home');
const serviceQualificationMapMounted = ref(false);
const trainingMapMounted = ref(false);
const runtimeStatus = ref('系统就绪');
const logs = ref(['平台初始化完成，等待工具操作']);
const isAuthenticated = ref(false);
const disclaimerVisible = ref(false);
const disclaimerMode = ref('view');
const licenseReady = ref(false);
const licenseRequired = ref(false);
const licenseAuthorized = ref(false);
const licenseStatusInfo = ref({});
const licenseBootMessage = ref('正在读取本机授权状态...');
const isBrowserFullscreen = ref(false);
const fullscreenMessage = ref('');
const unauthorizedModal = reactive({
  visible: false,
  featureName: ''
});

const licenseExpired = computed(() => isLicenseExpired(licenseStatusInfo.value));
const routeBlocked = computed(() => !hasToolAccess(licenseStatusInfo.value, activeTool.value));
const activeToolName = computed(() => toolFeatureLabel(activeTool.value));
const canExportExcel = computed(() => hasFeature(licenseStatusInfo.value, FEATURES.EXPORT_EXCEL));
const fullscreenToolKeys = new Set(['service-qualification-map', 'training-coverage-map']);
const fullscreenSupportedTool = computed(() => fullscreenToolKeys.has(activeTool.value) && !routeBlocked.value);

fetchLicenseStatus();

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

watch(
  activeTool,
  (toolKey) => {
    if (toolKey === 'service-qualification-map') {
      serviceQualificationMapMounted.value = true;
    }
    if (toolKey === 'training-coverage-map') {
      trainingMapMounted.value = true;
    }
    if (isBrowserFullscreen.value && !fullscreenToolKeys.has(toolKey)) {
      exitBrowserFullscreen();
    }
  },
  { immediate: true }
);

function handleLoginSuccess() {
  isAuthenticated.value = true;
  runtimeStatus.value = '登录成功，平台首页就绪';
  logs.value = ['用户登录成功，进入平台首页', ...logs.value].slice(0, 5);

  if (!hasStoredDisclaimerAgreement()) {
    window.setTimeout(() => {
      openDisclaimer('firstLogin');
    }, 120);
  }
}

function handleStatusChange(status) {
  runtimeStatus.value = status || '系统就绪';
}

function appendLog(message) {
  if (!message) return;
  logs.value = [message, ...logs.value].slice(0, 5);
}

function selectTool(toolKey) {
  if (!hasToolAccess(licenseStatusInfo.value, toolKey)) {
    showUnauthorizedFeature(toolFeatureLabel(toolKey));
    return;
  }
  activeTool.value = toolKey;
}

function showUnauthorizedFeature(featureName) {
  unauthorizedModal.featureName = featureName || '当前功能';
  unauthorizedModal.visible = true;
}

function openLicenseCenterFromModal() {
  unauthorizedModal.visible = false;
  if (isBrowserFullscreen.value) {
    exitBrowserFullscreen();
  }
  activeTool.value = 'license-center';
}

function openDisclaimer(mode = 'view') {
  disclaimerMode.value = mode;
  disclaimerVisible.value = true;
}

function handleDisclaimerAgree() {
  if (disclaimerMode.value === 'firstLogin') {
    storeDisclaimerAgreement();
    logs.value = ['用户已确认信息安全声明', ...logs.value].slice(0, 5);
  }
  disclaimerVisible.value = false;
}

function hasStoredDisclaimerAgreement() {
  try {
    const rawValue = window.localStorage.getItem(DISCLAIMER_STORAGE_KEY);
    if (!rawValue) return false;
    const parsed = JSON.parse(rawValue);
    return Boolean(parsed?.agreed) && parsed?.version === DISCLAIMER_VERSION;
  } catch {
    return false;
  }
}

function storeDisclaimerAgreement() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const agreeTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  window.localStorage.setItem(
    DISCLAIMER_STORAGE_KEY,
    JSON.stringify({
      agreed: true,
      agreeTime,
      version: DISCLAIMER_VERSION
    })
  );
}

async function fetchLicenseStatus() {
  licenseReady.value = false;
  licenseBootMessage.value = '正在读取本机授权状态...';
  try {
    const response = await fetch('/api/license/status');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || payload.error || '授权状态读取失败');
    }
    licenseStatusInfo.value = payload;
    licenseRequired.value = Boolean(payload.enabled);
    licenseAuthorized.value = !payload.enabled || payload.status === 'active' || payload.status === 'expired';
    licenseBootMessage.value = licenseAuthorized.value ? '授权校验完成，正在进入程序...' : '需要激活授权，正在打开授权页...';
    if (payload.status === 'expired') {
      activeTool.value = 'home';
      window.setTimeout(() => {
        showUnauthorizedFeature('授权已过期');
      }, 240);
    }
  } catch (error) {
    licenseStatusInfo.value = {
      enabled: true,
      status: 'invalid',
      message: error.message || '授权状态读取失败',
      machine_code: ''
    };
    licenseRequired.value = true;
    licenseAuthorized.value = false;
    licenseBootMessage.value = error.message || '授权状态读取失败';
  } finally {
    window.setTimeout(() => {
      licenseReady.value = true;
    }, 120);
  }
}

function handleLicenseActivated(info) {
  licenseStatusInfo.value = info || {};
  licenseRequired.value = Boolean(info?.enabled);
  licenseAuthorized.value = true;
  licenseReady.value = true;
  activeTool.value = 'license-center';
}

async function enterBrowserFullscreen() {
  fullscreenMessage.value = '';
  if (!fullscreenSupportedTool.value) {
    fullscreenMessage.value = '当前页面不支持全屏工作模式。';
    return;
  }

  try {
    const target = document.documentElement;
    if (!document.fullscreenElement) {
      await target.requestFullscreen();
    }
    isBrowserFullscreen.value = true;
    runtimeStatus.value = '已进入浏览器全屏工作模式';
  } catch (error) {
    fullscreenMessage.value = '请允许浏览器全屏，或按 F11 进入全屏模式。';
    appendLog(error?.message ? `浏览器全屏被阻止：${error.message}` : '浏览器全屏被阻止');
  }
}

async function exitBrowserFullscreen() {
  fullscreenMessage.value = '';
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    isBrowserFullscreen.value = false;
    runtimeStatus.value = '已退出浏览器全屏工作模式';
  } catch (error) {
    fullscreenMessage.value = '退出全屏失败，请按 ESC 或 F11 返回普通模式。';
    appendLog(error?.message ? `退出浏览器全屏失败：${error.message}` : '退出浏览器全屏失败');
  }
}

function handleFullscreenChange() {
  const fullscreenActive = Boolean(document.fullscreenElement);
  isBrowserFullscreen.value = fullscreenActive && fullscreenSupportedTool.value;
  if (!fullscreenActive && runtimeStatus.value === '已进入浏览器全屏工作模式') {
    runtimeStatus.value = '已退出浏览器全屏工作模式';
  }
}
</script>
