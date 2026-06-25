<template>
  <main class="license-page">
    <div class="login-grid-bg" aria-hidden="true"></div>
    <div class="login-glow login-glow-a" aria-hidden="true"></div>
    <div class="login-glow login-glow-b" aria-hidden="true"></div>

    <section class="license-guide-panel">
      <p class="section-kicker">SOFTWARE ACTIVATION</p>
      <h1>程序授权验证</h1>
      <p class="login-brand-desc">参考 `wechatgroupgrip` 的注册码机制，当前设备需完成授权后才能进入 RTS 工具箱。</p>

      <div class="license-flow">
        <div class="license-flow-step">
          <span class="license-flow-index">1</span>
          <span class="license-flow-label">复制机器码</span>
        </div>
        <div class="license-flow-step">
          <span class="license-flow-index">2</span>
          <span class="license-flow-label">发送给管理员</span>
        </div>
        <div class="license-flow-step">
          <span class="license-flow-index">3</span>
          <span class="license-flow-label">获取注册码</span>
        </div>
        <div class="license-flow-step">
          <span class="license-flow-index">4</span>
          <span class="license-flow-label">粘贴并激活</span>
        </div>
      </div>

      <div class="license-secure-note">注册码仅绑定当前设备，复制到其他电脑无法使用。</div>
    </section>

    <section class="license-main-panel">
      <section class="login-card license-card-shell">
        <header class="login-brand">
          <div class="brand-mark login-logo">RTS</div>
          <div>
            <h2>授权激活</h2>
            <p>RTS Toolbox License Center</p>
          </div>
        </header>

        <div class="license-form-card">
          <strong>① 获取当前机器码</strong>
          <p>请复制机器码并发送给管理员，用于生成本机专属注册码。</p>
          <div class="license-machine-row">
            <div class="license-code-box">{{ statusInfo.machine_code || '读取中...' }}</div>
            <button class="ghost-button" type="button" @click="copyMachineCode">复制机器码</button>
          </div>
        </div>

        <div class="license-form-card">
          <strong>② 输入注册码</strong>
          <p>请粘贴管理员提供的注册码，格式示例：`RTS-LIC-...`</p>
          <textarea
            v-model.trim="licenseCode"
            class="license-textarea"
            placeholder="请粘贴 RTS-LIC-... 注册码"
            @input="validateInput"
          ></textarea>
          <div class="license-validate" :class="validationTone">{{ validationText }}</div>
          <div class="license-actions">
            <button class="ghost-button" type="button" @click="$emit('refresh-status')">重新校验</button>
            <button class="primary-button" type="button" :disabled="!canActivate || activating" @click="activateLicense">
              <span>{{ activating ? '激活中' : '立即激活' }}</span>
            </button>
          </div>
        </div>

        <div class="license-form-card">
          <strong>③ 授权状态</strong>
          <div class="license-status-banner" :class="{ active: isActive }">
            <div class="license-status-icon">{{ isActive ? '已授权' : '未授权' }}</div>
            <div>
              <div class="license-status-main">{{ isActive ? '已激活' : '当前未激活' }}</div>
              <div class="license-status-sub">{{ statusMessage }}</div>
            </div>
          </div>
          <div class="license-summary-grid">
            <div><span>授权人</span><strong>{{ isActive ? statusInfo.license_user || '-' : '待激活' }}</strong></div>
            <div><span>部门</span><strong>{{ isActive ? statusInfo.department || '-' : '待激活' }}</strong></div>
            <div><span>版本</span><strong>{{ isActive ? statusInfo.version || '-' : '待激活' }}</strong></div>
            <div><span>到期时间</span><strong>{{ isActive ? statusInfo.expire_date || '-' : '待激活' }}</strong></div>
            <div><span>剩余天数</span><strong>{{ isActive ? `${statusInfo.remaining_days ?? '-'} 天` : '待激活' }}</strong></div>
          </div>
        </div>

        <Transition name="fade">
          <p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>
        </Transition>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  statusInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['activated', 'refresh-status']);

const licenseCode = ref('');
const validationText = ref('等待输入注册码');
const validationTone = ref('info');
const errorMessage = ref('');
const activating = ref(false);

const canActivate = computed(() => /^RTS-LIC-[A-Za-z0-9_-]+$/.test(licenseCode.value));
const isActive = computed(() => props.statusInfo?.status === 'active');
const statusMessage = computed(() => {
  if (isActive.value) return '授权已生效，可以继续使用 RTS 工具箱。';
  return props.statusInfo?.message || '请复制机器码并联系管理员获取授权。';
});

watch(() => props.statusInfo, () => {
  if (isActive.value) {
    errorMessage.value = '';
  }
}, { deep: true });

function validateInput() {
  if (!licenseCode.value) {
    validationText.value = '等待输入注册码';
    validationTone.value = 'info';
    return;
  }
  if (canActivate.value) {
    validationText.value = '格式初步有效';
    validationTone.value = 'ok';
    return;
  }
  validationText.value = '注册码格式不正确，请检查是否完整复制';
  validationTone.value = 'error';
}

async function activateLicense() {
  if (!canActivate.value) {
    validateInput();
    return;
  }
  activating.value = true;
  errorMessage.value = '';
  try {
    const response = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_code: licenseCode.value })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || payload.error || '激活失败');
    }
    emit('activated', payload.license || {});
  } catch (error) {
    errorMessage.value = error.message || '激活失败';
    validationText.value = errorMessage.value;
    validationTone.value = 'error';
  } finally {
    activating.value = false;
  }
}

async function copyMachineCode() {
  const text = props.statusInfo?.machine_code || '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    errorMessage.value = `请手动复制机器码：${text}`;
  }
}
</script>
