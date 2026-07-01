<template>
  <main class="login-page">
    <div class="login-grid-bg" aria-hidden="true"></div>
    <div class="login-glow login-glow-a" aria-hidden="true"></div>
    <div class="login-glow login-glow-b" aria-hidden="true"></div>

    <section class="login-brand-panel">
      <div class="brand-line brand-line-a" aria-hidden="true"></div>
      <div class="brand-line brand-line-b" aria-hidden="true"></div>
      <div class="brand-line brand-line-c" aria-hidden="true"></div>
      <img class="login-brand-logo" :src="brandConfig.logoSymbolTransparent" :alt="brandConfig.appNameCn" />
      <p class="section-kicker">{{ brandConfig.appNameEn }}</p>
      <h1>{{ brandConfig.appNameCn }}</h1>
      <p class="login-brand-desc">{{ brandConfig.tagline }}</p>
      <div class="login-slogan">{{ brandConfig.slogan }}</div>
      <p class="login-platform-desc">集工单处理、数据分析、服务资质、<br />培训发展与智能辅助于一体。</p>
      <div class="brand-metrics">
        <span v-for="item in capabilityTags" :key="item.label">
          <component :is="item.icon" :size="16" />
          {{ item.label }}
        </span>
      </div>
    </section>

    <section class="login-form-panel">
      <section class="login-card">
        <header class="login-brand">
          <div class="brand-mark login-logo image-logo">
            <img :src="brandConfig.logoMark" :alt="brandConfig.appShortName" />
          </div>
          <div>
            <h2>账号登录</h2>
            <p>{{ brandConfig.appNameEn }}</p>
          </div>
        </header>
        <p class="login-card-hint">请输入账号密码登录平台</p>

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

        <label class="login-agreement">
          <input
            v-model="disclaimerChecked"
            type="checkbox"
            :disabled="isLoading"
          />
          <span class="agreement-box" aria-hidden="true">
            <Check v-if="disclaimerChecked" :size="14" />
          </span>
          <span>
            我已阅读并同意
            <button
              class="agreement-link"
              type="button"
              :disabled="isLoading"
              @click.prevent.stop="openDisclaimer"
            >
              《信息安全声明》
            </button>
          </span>
        </label>

        <Transition name="fade">
          <p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>
        </Transition>

        <button class="login-button" type="submit" :disabled="isLoading">
          <LoaderCircle v-if="isLoading" class="spin" :size="18" />
          <ArrowRight v-else :size="18" />
          <span>{{ isLoading ? '登录中' : '进入平台' }}</span>
        </button>

      </form>
      </section>
      <div class="login-powered">{{ brandConfig.poweredBy }} · Version {{ brandConfig.version }}</div>
    </section>

    <SecurityDisclaimerModal
      :visible="disclaimerVisible"
      mode="login"
      @agree="agreeLoginDisclaimer"
      @cancel="disclaimerVisible = false"
    />
  </main>
</template>

<script setup>
import { ref } from 'vue';
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  DatabaseZap,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  MapPinned,
  ShieldCheck
} from 'lucide-vue-next';
import SecurityDisclaimerModal from './SecurityDisclaimerModal.vue';
import { brandConfig } from '../config/brandConfig';

const emit = defineEmits(['login-success']);

const DISCLAIMER_STORAGE_KEY = 'rts_toolbox_disclaimer_agreed';
const DISCLAIMER_VERSION = '1.0';

const capabilityTags = [
  { label: '工单管理', icon: ClipboardList },
  { label: '数据分析', icon: BarChart3 },
  { label: '服务资质', icon: MapPinned },
  { label: '培训发展', icon: GraduationCap },
  { label: '智能辅助', icon: DatabaseZap },
  { label: '授权管理', icon: ShieldCheck }
];

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const disclaimerChecked = ref(hasStoredDisclaimerAgreement());
const disclaimerVisible = ref(false);

function submitLogin() {
  errorMessage.value = '';

  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  if (!disclaimerChecked.value) {
    errorMessage.value = '请先阅读并同意信息安全声明';
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

function openDisclaimer() {
  disclaimerVisible.value = true;
}

function agreeLoginDisclaimer() {
  disclaimerChecked.value = true;
  storeDisclaimerAgreement();
  disclaimerVisible.value = false;
  errorMessage.value = '';
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
</script>
