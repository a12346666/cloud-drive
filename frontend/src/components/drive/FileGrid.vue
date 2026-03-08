<template>
  <div 
    ref="scrollContainer" 
    class="virtual-scroll-container"
    @scroll="handleScroll"
  >
    <div 
      class="virtual-scroll-content" 
      :style="{ height: `${totalHeight}px`, position: 'relative' }"
    >
      <div
        class="file-grid-inner"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="folder in visibleFolders"
          :key="folder.id"
          @click="$emit('itemClick', 'folder', folder.id, $event)"
          class="file-item group"
          :class="{ 'ring-2 ring-blue-500': isSelected('folder', folder.id) }"
        >
          <div class="checkbox-wrapper">
            <input
              type="checkbox"
              :checked="isSelected('folder', folder.id)"
              @click.stop
              @change="$emit('toggleSelect', 'folder', folder.id)"
              class="w-4 h-4 rounded"
              style="accent-color: var(--color-primary);"
            />
          </div>
          
          <button
            v-if="folder.isStarred"
            @click.stop="$emit('toggleStar', 'folder', folder.id)"
            class="star-btn absolute top-2 right-2 p-1"
            title="取消收藏"
          >
            <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          
          <div class="flex flex-col items-center text-center" @dblclick="$emit('openFolder', folder.id)">
            <div class="icon-wrapper folder-icon">
              <svg class="w-8 h-8" style="color: var(--color-primary);" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p class="item-name">{{ folder.name }}</p>
            <p class="item-meta">{{ folder.fileCount + folder.folderCount }} 项</p>
          </div>
        </div>

        <div
          v-for="file in visibleFiles"
          :key="file.id"
          class="file-item group"
          :class="{ 'ring-2 ring-blue-500': isSelected('file', file.id) }"
          @click="$emit('itemClick', 'file', file.id, $event)"
        >
          <div class="checkbox-wrapper">
            <input
              type="checkbox"
              :checked="isSelected('file', file.id)"
              @click.stop
              @change="$emit('toggleSelect', 'file', file.id)"
              class="w-4 h-4 rounded"
              style="accent-color: var(--color-primary);"
            />
          </div>
          
          <div class="flex flex-col items-center text-center">
            <div class="icon-wrapper relative">
              <FileIcon :icon="file.icon" class="w-8 h-8" />
              <div v-if="file.isEncrypted" class="encrypted-badge">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p class="item-name">{{ file.name }}</p>
            <p class="item-meta">{{ file.sizeFormatted }}</p>
          </div>
          
          <div class="action-buttons">
            <button
              @click.stop="$emit('toggleStar', 'file', file.id)"
              class="action-btn-icon star"
              :class="{ active: file.isStarred }"
              :title="file.isStarred ? '取消收藏' : '添加收藏'"
            >
              <svg class="w-4 h-4" :fill="file.isStarred ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            
            <button
              @click.stop="$emit('share', file)"
              class="action-btn-icon share"
              title="分享"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            
            <button
              @click.stop="$emit('delete', file.id)"
              class="action-btn-icon delete"
              title="删除"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import FileIcon from '@/components/common/FileIcon.vue'

const props = defineProps<{
  folders: any[]
  files: any[]
  isSelected: (type: 'file' | 'folder', id: number) => boolean
}>()

defineEmits<{
  itemClick: [type: 'file' | 'folder', id: number, event: MouseEvent]
  toggleSelect: [type: 'file' | 'folder', id: number]
  toggleStar: [type: 'file' | 'folder', id: number]
  openFolder: [id: number]
  share: [file: any]
  delete: [fileId: number]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const itemHeight = 140
const columns = ref(6)

const updateColumns = () => {
  const width = window.innerWidth
  if (width < 640) columns.value = 2
  else if (width < 768) columns.value = 3
  else if (width < 1024) columns.value = 4
  else if (width < 1280) columns.value = 5
  else columns.value = 6
}

onMounted(() => {
  updateColumns()
  window.addEventListener('resize', updateColumns)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateColumns)
})

const totalItems = computed(() => props.folders.length + props.files.length)
const rowHeight = computed(() => itemHeight)
const totalRows = computed(() => Math.ceil(totalItems.value / columns.value))
const totalHeight = computed(() => totalRows.value * rowHeight.value)

const startRow = computed(() => Math.floor(scrollTop.value / rowHeight.value))
const visibleRowCount = computed(() => {
  if (!scrollContainer.value) return 10
  return Math.ceil(scrollContainer.value.clientHeight / rowHeight.value) + 2
})

const offsetY = computed(() => startRow.value * rowHeight.value)

const visibleItems = computed(() => {
  const start = startRow.value * columns.value
  const end = Math.min(start + visibleRowCount.value * columns.value, totalItems.value)
  const items = []
  
  for (let i = start; i < end; i++) {
    if (i < props.folders.length) {
      items.push({ type: 'folder', data: props.folders[i], index: i })
    } else {
      const fileIndex = i - props.folders.length
      if (fileIndex < props.files.length) {
        items.push({ type: 'file', data: props.files[fileIndex], index: i })
      }
    }
  }
  
  return items
})

const visibleFolders = computed(() => 
  visibleItems.value.filter(item => item.type === 'folder').map(item => item.data)
)

const visibleFiles = computed(() => 
  visibleItems.value.filter(item => item.type === 'file').map(item => item.data)
)

const handleScroll = () => {
  if (scrollContainer.value) {
    scrollTop.value = scrollContainer.value.scrollTop
  }
}

watch([() => props.folders, () => props.files], () => {
  if (scrollContainer.value) {
    scrollTop.value = scrollContainer.value.scrollTop
  }
})
</script>

<style scoped>
.virtual-scroll-container {
  height: calc(100vh - 350px);
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-scroll-content {
  position: relative;
}

.file-grid-inner {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  will-change: transform;
}

@media (max-width: 1279px) {
  .file-grid-inner {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 1023px) {
  .file-grid-inner {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 767px) {
  .file-grid-inner {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 639px) {
  .file-grid-inner {
    grid-template-columns: repeat(2, 1fr);
  }
}

.file-item {
  padding: 1rem;
  cursor: pointer;
  position: relative;
  border-radius: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.file-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.checkbox-wrapper {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .checkbox-wrapper,
.file-item.ring-2 .checkbox-wrapper {
  opacity: 1;
}

.icon-wrapper {
  width: 4rem;
  height: 4rem;
  margin-bottom: 0.75rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  background: var(--bg-secondary);
}

.file-item:hover .icon-wrapper {
  transform: scale(1.1);
}

.folder-icon {
  background: rgba(59, 130, 246, 0.2);
}

.item-name {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  color: var(--text-primary);
}

.item-meta {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  color: var(--text-secondary);
}

.encrypted-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-success);
}

.action-buttons {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .action-buttons {
  opacity: 1;
}

.action-btn-icon {
  padding: 0.375rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.action-btn-icon.star {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.action-btn-icon.star.active {
  background: rgba(245, 158, 11, 0.2);
}

.action-btn-icon.share {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-primary);
}

.action-btn-icon.share:hover {
  background: rgba(59, 130, 246, 0.3);
}

.action-btn-icon.delete {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
}

.action-btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.3);
}
</style>
