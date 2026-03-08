<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content animate-scale-in">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">新建文件夹</h3>
        <input
          :value="folderName"
          type="text"
          class="modal-input"
          placeholder="请输入文件夹名称"
          @input="$emit('update:folderName', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('confirm')"
        />
        <div class="flex space-x-3">
          <button @click="$emit('close')" class="modal-btn secondary">
            取消
          </button>
          <button
            @click="$emit('confirm')"
            class="modal-btn primary"
            :disabled="!folderName.trim()"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  folderName: string
}>()

defineEmits<{
  close: []
  confirm: []
  'update:folderName': [value: string]
}>()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
}

.modal-content {
  padding: 1.5rem;
  width: 100%;
  max-width: 24rem;
  border-radius: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-xl);
}

.modal-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.modal-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
}

.modal-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-btn.secondary:hover {
  background: var(--bg-secondary);
}

.modal-btn.primary {
  background: var(--color-primary);
  color: white;
}

.modal-btn.primary:hover {
  background: var(--color-primary-hover);
}

.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
