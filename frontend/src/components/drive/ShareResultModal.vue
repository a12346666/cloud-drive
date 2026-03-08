<template>
  <Teleport to="body">
    <div v-if="result" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content animate-scale-in">
        <div class="text-center mb-4">
          <div class="success-icon">
            <svg class="w-6 h-6" style="color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold" style="color: var(--text-primary);">分享创建成功</h3>
        </div>
        
        <div class="share-link-box">
          <p class="text-xs mb-1" style="color: var(--text-secondary);">分享链接</p>
          <div class="flex items-center space-x-2">
            <input
              :value="result.url"
              readonly
              class="flex-1 bg-transparent text-sm outline-none"
              style="color: var(--text-primary);"
            />
            <button @click="copyLink" class="copy-btn">
              复制
            </button>
          </div>
        </div>

        <button @click="$emit('close')" class="modal-btn primary w-full">
          完成
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  result: { url: string } | null
}>()

const emit = defineEmits<{
  close: []
}>()

const copyLink = () => {
  if (props.result?.url) {
    navigator.clipboard.writeText(props.result.url)
    alert('链接已复制到剪贴板')
  }
}
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
  max-width: 28rem;
  border-radius: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-xl);
}

.success-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.2);
}

.share-link-box {
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--bg-secondary);
}

.copy-btn {
  padding: 0.25rem 0.75rem;
  color: white;
  font-size: 0.75rem;
  border-radius: 0.5rem;
  background: var(--color-primary);
  transition: background 0.2s;
}

.copy-btn:hover {
  background: var(--color-primary-hover);
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
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
