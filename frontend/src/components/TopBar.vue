<template>
  <header class="top-bar">
    <div class="top-title">
      <div class="logo-orbit">
        <Activity :size="20" />
      </div>
      <div>
        <strong>RTS工程师效率工具箱</strong>
        <span>RTS Technical Support Platform</span>
      </div>
    </div>

    <div class="top-actions">
      <div class="theme-chip" aria-label="当前为深色模式">
        <Moon :size="16" />
        <span>深色模式</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Activity, Moon } from 'lucide-vue-next';
</script>
