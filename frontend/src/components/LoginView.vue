<template>
  <main class="login-page">
    <div class="login-grid-bg" aria-hidden="true"></div>
    <div class="login-glow login-glow-a" aria-hidden="true"></div>
    <div class="login-glow login-glow-b" aria-hidden="true"></div>

    <section class="login-brand-panel">
      <div class="brand-line brand-line-a" aria-hidden="true"></div>
      <div class="brand-line brand-line-b" aria-hidden="true"></div>
      <div class="brand-line brand-line-c" aria-hidden="true"></div>
      <p class="section-kicker">RTS Technical Support Platform</p>
      <h1>RTS工程师效率工具箱</h1>
      <p class="login-brand-desc">面向 RTS 技术支持工程师的一站式效率处理平台</p>
      <div class="brand-metrics">
        <span>
          <ClipboardList :size="16" />
          工单处理
        </span>
        <span>
          <DatabaseZap :size="16" />
          数据清洗
        </span>
        <span>
          <Wrench :size="16" />
          工程师工具
        </span>
      </div>
    </section>

    <section class="login-form-panel">
      <section class="login-card">
        <header class="login-brand">
          <div class="brand-mark login-logo">RTS</div>
          <div>
            <h2>账号登录</h2>
            <p>RTS Technical Support Platform</p>
          </div>
        </header>

      <form class="login-form" @submit.prevent="submitLogin">
        <label class="login-field">
          <span>用户名</span>
          <input
            v-model.trim="username"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
            :disabled="isLoading"
          />
        </label>

        <label class="login-field">
          <span>密码</span>
          <div class="password-control">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
              :disabled="isLoading"
            />
            <button
              class="password-toggle"
              type="button"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </div>
        </label>

        <Transition name="fade">
          <p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>
        </Transition>

        <button class="login-button" type="submit" :disabled="isLoading">
          <LoaderCircle v-if="isLoading" class="spin" :size="18" />
          <LogIn v-else :size="18" />
          <span>{{ isLoading ? '登录中' : '登录' }}</span>
        </button>

      </form>
      </section>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import {
  ClipboardList,
  DatabaseZap,
  Eye,
  EyeOff,
  LoaderCircle,
  LogIn,
  Wrench
} from 'lucide-vue-next';

const emit = defineEmits(['login-success']);

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

function submitLogin() {
  errorMessage.value = '';

  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  isLoading.value = true;

  window.setTimeout(() => {
    const usernameMatched = username.value.trim().toLowerCase() === 'admin';
    const passwordMatched = password.value.trim().toLowerCase() === 'admin';

    if (usernameMatched && passwordMatched) {
      emit('login-success');
      return;
    }

    errorMessage.value = '用户名或密码错误，请重新输入';
    isLoading.value = false;
  }, 450);
}
</script>
