<template>
  <div class="tool-page license-center-page">
    <section class="tool-header">
      <div class="tool-icon image-logo license-center-logo">
        <img :src="brandConfig.logoMark" :alt="brandConfig.appShortName" />
      </div>
      <div>
        <p class="section-kicker">License Center</p>
        <h1>{{ brandConfig.appNameCn }}授权中心</h1>
        <p>查看当前授权状态、功能权限与设备绑定信息。</p>
      </div>
    </section>

    <section class="glass-panel license-center-summary">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">License Profile</p>
          <h2>基础授权信息</h2>
        </div>
        <span class="status-pill" :class="statusTone">{{ statusText }}</span>
      </div>

      <div class="license-center-grid">
        <div><span>授权用户</span><strong>{{ licenseInfo.license_user || '-' }}</strong></div>
        <div><span>部门</span><strong>{{ licenseInfo.department || '-' }}</strong></div>
        <div><span>授权版本</span><strong>{{ licenseInfo.version || '-' }}</strong></div>
        <div><span>到期时间</span><strong>{{ licenseInfo.expire_date || '-' }}</strong></div>
        <div><span>机器码</span><strong>{{ licenseInfo.machine_code || '-' }}</strong></div>
        <div><span>授权状态</span><strong>{{ statusText }}</strong></div>
      </div>

      <div v-if="licenseInfo.legacy_license" class="license-center-warning">
        当前授权为旧版授权，建议更新授权密钥以开放更多功能。
      </div>
      <div v-else-if="licenseInfo.message" class="license-center-warning">
        {{ licenseInfo.message }}
      </div>

      <div class="license-center-actions">
        <button class="ghost-button" type="button" @click="copyMachineCode">
          <Copy :size="17" />
          <span>{{ copied ? '已复制机器码' : '复制机器码' }}</span>
        </button>
        <button class="ghost-button" type="button" @click="toggleActivation">
          <KeyRound :size="17" />
          <span>导入/更新授权密钥</span>
        </button>
        <button class="primary-button" type="button" @click="$emit('refresh-license')">
          <RefreshCcw :size="17" />
          <span>刷新授权状态</span>
        </button>
      </div>
    </section>

    <section v-if="showActivation" class="glass-panel license-center-activation">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Update License</p>
          <h2>更新注册码</h2>
        </div>
      </div>
      <textarea
        v-model.trim="licenseCode"
        class="license-textarea"
        placeholder="请粘贴管理员提供的注册码"
      ></textarea>
      <div class="license-center-actions">
        <button class="ghost-button" type="button" @click="licenseCode = ''">清空</button>
        <button class="primary-button" type="button" :disabled="!canActivate || activating" @click="activateLicense">
          <KeyRound :size="17" />
          <span>{{ activating ? '正在激活' : '激活/更新' }}</span>
        </button>
      </div>
      <div v-if="activationMessage" class="license-validate" :class="activationTone">{{ activationMessage }}</div>
    </section>

    <section class="glass-panel license-feature-panel">
      <div class="panel-title-row">
        <div>
          <p class="section-kicker">Feature Matrix</p>
          <h2>功能授权列表</h2>
        </div>
      </div>
      <div class="table-shell license-feature-table">
        <table>
          <thead>
            <tr>
              <th>功能名称</th>
              <th>功能标识</th>
              <th>授权状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feature in featureRows" :key="feature.key">
              <td>{{ feature.name }}</td>
              <td>{{ feature.key }}</td>
              <td>
                <span class="license-feature-status" :class="{ active: feature.enabled }">
                  {{ statusLabel(feature.enabled) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="system-status-panel">
      <div class="system-status-item">
        <ShieldCheck :size="18" />
        <strong>{{ brandConfig.poweredBy }}</strong>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Copy, KeyRound, RefreshCcw, ShieldCheck } from 'lucide-vue-next';
import { brandConfig } from '../config/brandConfig';
import { FEATURE_LABELS, FEATURES, normalizeFeatures } from '../utils/licenseFeatures';

const props = defineProps({
  licenseInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['refresh-license', 'activated', 'status-change', 'log']);

const showActivation = ref(false);
const licenseCode = ref('');
const activating = ref(false);
const activationMessage = ref('');
const activationTone = ref('');
const copied = ref(false);

const featureRows = computed(() => {
  const features = normalizeFeatures(props.licenseInfo?.features);
  return Object.values(FEATURES).map((key) => ({
    key,
    name: FEATURE_LABELS[key],
    enabled: props.licenseInfo?.status === 'active' && Boolean(features[key])
  }));
});

const statusText = computed(() => {
  if (props.licenseInfo?.enabled === false) return '免授权';
  if (props.licenseInfo?.status === 'active') return '已授权';
  if (props.licenseInfo?.status === 'expired') return '已过期';
  if (props.licenseInfo?.status === 'inactive') return '未激活';
  return '授权异常';
});

const statusTone = computed(() => {
  if (props.licenseInfo?.status === 'active' || props.licenseInfo?.enabled === false) return 'success';
  if (props.licenseInfo?.status === 'expired') return 'error';
  return 'warning';
});

const canActivate = computed(() => /^[A-Za-z0-9_-]{16,}$/.test(licenseCode.value));

function statusLabel(enabled) {
  if (props.licenseInfo?.status === 'expired') return '授权已过期';
  return enabled ? '已授权' : '未授权';
}

function toggleActivation() {
  showActivation.value = !showActivation.value;
}

async function copyMachineCode() {
  if (!props.licenseInfo?.machine_code) return;
  await navigator.clipboard.writeText(props.licenseInfo.machine_code);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1400);
}

async function activateLicense() {
  if (!canActivate.value || activating.value) return;
  activating.value = true;
  activationMessage.value = '正在激活授权...';
  activationTone.value = '';
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
    activationMessage.value = '授权更新成功';
    activationTone.value = 'ok';
    licenseCode.value = '';
    emit('activated', payload.license || {});
    emit('log', '授权密钥已更新');
  } catch (error) {
    activationMessage.value = error.message || '激活失败，请检查注册码';
    activationTone.value = 'error';
  } finally {
    activating.value = false;
  }
}
</script>
