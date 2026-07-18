<template>
  <section class="glass-panel shared-data-import-hub" :class="{ compact }">
    <div class="shared-data-import-hub-head">
      <div>
        <p class="section-kicker">{{ kicker }}</p>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <button class="primary-button" type="button" :disabled="Boolean(activeImportKey)" @click="dialogVisible = true">
        <Upload :size="18" />
        <span>Import Data</span>
      </button>
    </div>

    <div class="shared-data-source-list" aria-label="Shared datasets">
      <article v-for="source in sources" :key="source.key" class="shared-data-source-row" :class="{ ready: source.ready, blocked: source.blocked }">
        <div class="shared-data-source-icon" :class="source.ready ? 'ready' : 'waiting'">
          <CheckCircle2 v-if="source.ready" :size="20" />
          <Database v-else :size="20" />
        </div>
        <div class="shared-data-source-copy">
          <strong>{{ source.label }}</strong>
          <span>{{ source.description }}</span>
          <small v-if="source.blocked">{{ source.blockedMessage }}</small>
        </div>
        <div class="shared-data-source-meta">
          <strong>{{ source.ready ? formatNumber(source.recordCount) : 'Not imported' }}</strong>
          <span>{{ source.ready ? source.recordLabel : 'Shared data source' }}</span>
        </div>
        <div class="shared-data-source-update">
          <span>{{ source.ready ? 'Last updated' : 'Status' }}</span>
          <strong>{{ source.ready ? formatDate(source.updatedAt) : (source.blocked ? 'Blocked' : 'Waiting for import') }}</strong>
        </div>
      </article>
    </div>

    <p class="shared-data-import-hub-note">{{ note }}</p>

    <Teleport to="body">
      <div v-if="dialogVisible" class="shared-data-import-backdrop" @click.self="closeDialog">
        <section class="shared-data-import-dialog" role="dialog" aria-modal="true" :aria-label="`${title} import`">
          <div class="shared-data-import-dialog-head">
            <div>
              <p class="section-kicker">DATA IMPORT</p>
              <h2>Select a data source</h2>
              <p>Choose the workbook to import or replace. The related map updates automatically.</p>
            </div>
            <button class="icon-button" type="button" aria-label="Close import dialog" @click="closeDialog"><X :size="18" /></button>
          </div>

          <div class="shared-data-import-dialog-list">
            <article v-for="source in sources" :key="`dialog-${source.key}`" class="shared-data-import-choice" :class="{ blocked: source.blocked }">
              <div>
                <strong>{{ source.label }}</strong>
                <span>{{ source.description }}</span>
                <small v-if="source.blocked">{{ source.blockedMessage }}</small>
              </div>
              <button class="primary-button" type="button" :disabled="source.blocked || Boolean(activeImportKey)" @click="selectSource(source.key)">
                <Upload :size="16" />
                <span>{{ source.ready ? 'Replace Data' : 'Import Excel' }}</span>
              </button>
            </article>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { CheckCircle2, Database, Upload, X } from 'lucide-vue-next';

defineProps({
  kicker: { type: String, default: 'GLOBAL DATA MANAGEMENT' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  note: { type: String, default: 'Imported data is shared by the China and International map pages.' },
  sources: { type: Array, default: () => [] },
  activeImportKey: { type: String, default: '' },
  locale: { type: String, default: 'en-US' },
  compact: { type: Boolean, default: false }
});

const emit = defineEmits(['select-import']);
const dialogVisible = ref(false);

function selectSource(key) {
  dialogVisible.value = false;
  emit('select-import', key);
}

function closeDialog() {
  dialogVisible.value = false;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}
</script>
