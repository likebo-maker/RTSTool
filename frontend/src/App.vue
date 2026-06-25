<template>
  <div v-if="!licenseReady" class="boot-screen">
    <div class="glass-panel boot-card">
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

  <div v-else class="app-shell">
    <Sidebar
      :collapsed="sidebarCollapsed"
      :active-tool="activeTool"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @select="activeTool = $event"
    />

    <div class="app-frame">
      <TopBar :license-info="licenseStatusInfo" @show-disclaimer="openDisclaimer('view')" />

      <main class="main-content">
        <TimeoutTicketTool
          v-if="activeTool === 'timeout-ticket-filter'"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <OnlineBusinessTool
          v-else-if="activeTool === 'online-business-calculation'"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <ServiceQualificationMap
          v-else-if="activeTool === 'service-qualification-map'"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <TrainingCoverageMap
          v-else-if="activeTool === 'training-coverage-map'"
          @status-change="handleStatusChange"
          @log="appendLog"
        />
        <HomeOverview
          v-else-if="activeTool === 'home'"
          @select-tool="activeTool = $event"
          @status-change="handleStatusChange"
        />
        <ToolPlaceholder
          v-else
          :tool-key="activeTool"
          @status-change="handleStatusChange"
        />
      </main>

      <StatusBar
        :status="runtimeStatus"
        :logs="logs"
        version="v1.1.0"
      />
    </div>
  </div>

  <SecurityDisclaimerModal
    :visible="disclaimerVisible"
    :mode="disclaimerMode"
    @agree="handleDisclaimerAgree"
    @cancel="disclaimerVisible = false"
  />
</template>

<script setup>
import { ref } from 'vue';
import LoginView from './components/LoginView.vue';
import LicenseActivationView from './components/LicenseActivationView.vue';
import SecurityDisclaimerModal from './components/SecurityDisclaimerModal.vue';
import Sidebar from './components/Sidebar.vue';
import StatusBar from './components/StatusBar.vue';
import ToolPlaceholder from './components/ToolPlaceholder.vue';
import TopBar from './components/TopBar.vue';
import HomeOverview from './tools/HomeOverview.vue';
import OnlineBusinessTool from './tools/OnlineBusinessTool.vue';
import ServiceQualificationMap from './tools/ServiceQualificationMap.vue';
import TrainingCoverageMap from './tools/TrainingCoverageMap.vue';
import TimeoutTicketTool from './tools/TimeoutTicketTool.vue';

const DISCLAIMER_STORAGE_KEY = 'rts_toolbox_disclaimer_agreed';
const DISCLAIMER_VERSION = '1.0';

const sidebarCollapsed = ref(false);
const activeTool = ref('home');
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

fetchLicenseStatus();

function handleLoginSuccess() {
  isAuthenticated.value = true;
  runtimeStatus.value = '登录成功，工具箱首页就绪';
  logs.value = ['用户登录成功，进入工具箱首页', ...logs.value].slice(0, 5);

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
    licenseAuthorized.value = !payload.enabled || payload.status === 'active';
    licenseBootMessage.value = licenseAuthorized.value ? '授权校验通过，正在进入程序...' : '需要激活授权，正在打开授权页...';
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
}
</script>
