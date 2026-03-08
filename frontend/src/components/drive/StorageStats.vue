<template>
  <div class="storage-stats">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold theme-transition" style="color: var(--text-primary);">存储空间</h2>
        <p class="text-sm mt-1 theme-transition" style="color: var(--text-secondary);">
          已使用 {{ usedFormatted }} / {{ limitFormatted }}
        </p>
      </div>
      <div class="text-right">
        <span class="text-2xl font-bold" style="color: var(--color-primary);">{{ percentage }}%</span>
      </div>
    </div>
    <div class="h-2 rounded-full overflow-hidden" style="background: var(--bg-tertiary);">
      <div
        class="h-full rounded-full transition-all duration-300"
        :style="{ 
          width: `${percentage}%`,
          backgroundColor: progressColor
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  usedFormatted?: string
  limitFormatted?: string
  percentage: number
}>()

const progressColor = computed(() => {
  if (props.percentage >= 90) return 'var(--color-danger)'
  if (props.percentage >= 70) return 'var(--color-warning)'
  return 'var(--color-primary)'
})
</script>

<style scoped>
.storage-stats {
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-radius: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-sm);
}
</style>
