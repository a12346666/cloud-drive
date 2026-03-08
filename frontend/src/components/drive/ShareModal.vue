<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content animate-scale-in">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">分享文件</h3>
        <p class="text-sm mb-4" style="color: var(--text-secondary);">{{ file?.name }}</p>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">访问密码(可选)</label>
            <input
              v-model="form.password"
              type="text"
              class="modal-input"
              placeholder="不设置则为公开访问"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">有效期(天)</label>
            <select v-model="form.expireDays" class="modal-input">
              <option :value="0">永久有效</option>
              <option :value="1">1天</option>
              <option :value="7">7天</option>
              <option :value="30">30天</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">最大下载次数</label>
            <select v-model="form.maxDownloads" class="modal-input">
              <option :value="0">无限制</option>
              <option :value="1">1次</option>
              <option :value="5">5次</option>
              <option :value="10">10次</option>
              <option :value="50">50次</option>
            </select>
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button @click="$emit('close')" class="modal-btn secondary">
            取消
          </button>
          <button
            @click="$emit('create', form)"
            class="modal-btn primary"
            :disabled="loading"
          >
            {{ loading ? '创建中...' : '创建分享' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

const props = defineProps<{
  show: boolean
  file: any
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  create: [form: { password: string; expireDays: number; maxDownloads: number }]
}>()

const form = reactive({
  password: '',
  expireDays: 7,
  maxDownloads: 0,
})

watch(() => props.show, (show) => {
  if (show) {
    form.password = ''
    form.expireDays = 7
    form.maxDownloads = 0
  }
})
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

.modal-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
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
