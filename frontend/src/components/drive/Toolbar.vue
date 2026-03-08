<template>
  <div class="toolbar">
    <nav class="flex items-center space-x-2 text-sm">
      <button
        v-for="(item, index) in folderPath"
        :key="index"
        @click="$emit('navigate', item.id)"
        class="breadcrumb-item"
        :class="{ 'font-medium': index === folderPath.length - 1 }"
        :style="{ 
          color: index === folderPath.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
        }"
      >
        <span v-if="index > 0" class="mx-2" style="color: var(--text-tertiary);">/</span>
        <span>{{ item.name }}</span>
      </button>
    </nav>

    <div class="flex items-center space-x-3">
      <div class="relative">
        <input
          :value="searchKeyword"
          type="text"
          class="search-input"
          placeholder="搜索文件..."
          @input="$emit('update:searchKeyword', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('search')"
        />
        <svg class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <select
        :value="sortOption"
        @change="$emit('update:sortOption', ($event.target as HTMLSelectElement).value)"
        class="sort-select"
      >
        <option value="createdAt:desc">最新上传</option>
        <option value="createdAt:asc">最早上传</option>
        <option value="originalName:asc">名称 A-Z</option>
        <option value="originalName:desc">名称 Z-A</option>
        <option value="size:desc">大小 降序</option>
        <option value="size:asc">大小 升序</option>
      </select>

      <label class="encrypt-toggle">
        <input
          :checked="enableEncryption"
          type="checkbox"
          class="w-4 h-4 rounded"
          style="accent-color: var(--color-primary);"
          @change="$emit('update:enableEncryption', ($event.target as HTMLInputElement).checked)"
        />
        <span class="text-sm" style="color: var(--text-primary);">加密上传</span>
        <svg class="w-4 h-4" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="使用AES-256-GCM加密文件">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </label>

      <button @click="$emit('createFolder')" class="action-btn secondary">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <span>新建文件夹</span>
      </button>

      <button @click="$emit('upload')" class="action-btn primary">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>上传文件</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  folderPath: Array<{ id: number | null; name: string }>
  searchKeyword: string
  sortOption: string
  enableEncryption: boolean
}>()

defineEmits<{
  navigate: [id: number | null]
  search: []
  createFolder: []
  upload: []
  'update:searchKeyword': [value: string]
  'update:sortOption': [value: string]
  'update:enableEncryption': [value: boolean]
}>()
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: var(--color-primary);
}

.search-input {
  width: 16rem;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border-radius: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.sort-select {
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.encrypt-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: background 0.2s;
}

.encrypt-toggle:hover {
  background: var(--bg-tertiary);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action-btn.secondary:hover {
  background: var(--bg-secondary);
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-primary-hover);
}
</style>
