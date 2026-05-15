<template>
  <LoginView v-if="!isAuthenticated" @login-success="handleLoginSuccess" />

  <div v-else class="app-shell">
    <Sidebar
      :collapsed="sidebarCollapsed"
      :active-tool="activeTool"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @select="activeTool = $event"
    />

    <div class="app-frame">
      <TopBar />

      <main class="main-content">
        <TimeoutTicketTool
          v-if="activeTool === 'timeout-ticket-filter'"
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
</template>

<script setup>
import { ref } from 'vue';
import LoginView from './components/LoginView.vue';
import Sidebar from './components/Sidebar.vue';
import StatusBar from './components/StatusBar.vue';
import ToolPlaceholder from './components/ToolPlaceholder.vue';
import TopBar from './components/TopBar.vue';
import HomeOverview from './tools/HomeOverview.vue';
import TimeoutTicketTool from './tools/TimeoutTicketTool.vue';

const sidebarCollapsed = ref(false);
const activeTool = ref('home');
const runtimeStatus = ref('系统就绪');
const logs = ref(['平台初始化完成，等待工具操作']);
const isAuthenticated = ref(false);

function handleLoginSuccess() {
  isAuthenticated.value = true;
  runtimeStatus.value = '登录成功，工具箱首页就绪';
  logs.value = ['用户登录成功，进入工具箱首页', ...logs.value].slice(0, 5);
}

function handleStatusChange(status) {
  runtimeStatus.value = status || '系统就绪';
}

function appendLog(message) {
  if (!message) return;
  logs.value = [message, ...logs.value].slice(0, 5);
}
</script>
