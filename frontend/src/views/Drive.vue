<template>
  <div class="drive-page">
    <AppHeader
      :username="authStore.user?.username"
      :email="authStore.user?.email"
      :isAdmin="authStore.isAdmin"
      @logout="handleLogout"
    />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StorageStats
        :usedFormatted="fileStore.storageStats?.usedFormatted"
        :limitFormatted="fileStore.storageStats?.limitFormatted"
        :percentage="fileStore.storageStats?.percentage || 0"
      />

      <div v-if="fileStore.selectedItems.length > 0" class="batch-actions">
        <div class="flex items-center space-x-4">
          <span class="text-sm" style="color: var(--text-primary);">已选择 {{ fileStore.selectedItems.length }} 项</span>
          <button @click="fileStore.selectAll()" class="batch-btn select-all">全选</button>
          <button @click="fileStore.clearSelection()" class="batch-btn cancel">取消选择</button>
        </div>
        <div class="flex items-center space-x-2">
          <button @click="handleBatchStar(true)" class="batch-btn star">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>收藏</span>
          </button>
          <button @click="handleBatchDelete" class="batch-btn delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>删除</span>
          </button>
        </div>
      </div>

      <Toolbar
        :folderPath="fileStore.folderPath"
        v-model:searchKeyword="searchKeyword"
        v-model:sortOption="sortOption"
        v-model:enableEncryption="fileStore.enableEncryption"
        @navigate="navigateToBreadcrumb"
        @search="handleSearch"
        @createFolder="showCreateFolder = true"
        @upload="$refs.fileInput.click()"
      />

      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        @change="handleFileUpload"
      />

      <div v-if="fileStore.loading" class="loading-container">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="fileStore.allItems.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg class="w-12 h-12" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium mb-2" style="color: var(--text-primary);">文件夹为空</h3>
        <p style="color: var(--text-secondary);">点击上方按钮上传文件或创建文件夹</p>
      </div>

      <FileGrid
        v-else
        :folders="fileStore.folders"
        :files="fileStore.files"
        :isSelected="fileStore.isSelected"
        @itemClick="handleItemClick"
        @toggleSelect="fileStore.toggleSelection"
        @toggleStar="handleToggleStar"
        @openFolder="fileStore.navigateToFolder"
        @share="openShareModal"
        @delete="deleteFile"
      />

      <div
        v-if="isDragging"
        class="drag-overlay"
      >
        <div class="drag-hint">
          <svg class="w-16 h-16 mx-auto mb-4" style="color: var(--color-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-lg font-medium" style="color: var(--text-primary);">释放文件以上传</p>
        </div>
      </div>
    </main>

    <CreateFolderModal
      v-model:show="showCreateFolder"
      v-model:folderName="newFolderName"
      @close="showCreateFolder = false"
      @confirm="createFolder"
    />

    <ShareModal
      v-model:show="showShareModal"
      :file="selectedFile"
      :loading="isSharing"
      @close="showShareModal = false"
      @create="createShare"
    />

    <ShareResultModal
      :result="shareResult"
      @close="shareResult = null"
    />

    <div v-if="fileStore.uploadProgress > 0" class="upload-progress">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium" style="color: var(--text-primary);">上传中...</span>
        <span class="text-sm" style="color: var(--text-secondary);">{{ fileStore.uploadProgress }}%</span>
      </div>
      <div class="h-2 rounded-full overflow-hidden" style="background: var(--bg-tertiary);">
        <div class="h-full rounded-full transition-all duration-300" style="background: var(--color-primary);" :style="{ width: `${fileStore.uploadProgress}%` }"></div>
      </div>
    </div>

    <div v-if="fileStore.error" class="error-toast">
      {{ fileStore.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFileStore } from '@/stores/file'
import AppHeader from '@/components/drive/AppHeader.vue'
import StorageStats from '@/components/drive/StorageStats.vue'
import Toolbar from '@/components/drive/Toolbar.vue'
import FileGrid from '@/components/drive/FileGrid.vue'
import CreateFolderModal from '@/components/drive/CreateFolderModal.vue'
import ShareModal from '@/components/drive/ShareModal.vue'
import ShareResultModal from '@/components/drive/ShareResultModal.vue'
import api from '@/api/axios'

const router = useRouter()
const authStore = useAuthStore()
const fileStore = useFileStore()

const showCreateFolder = ref(false)
const newFolderName = ref('')
const showShareModal = ref(false)
const selectedFile = ref<any>(null)
const isSharing = ref(false)
const shareResult = ref<any>(null)
const searchKeyword = ref('')
const sortOption = ref('createdAt:desc')
const isDragging = ref(false)

onMounted(() => {
  fileStore.fetchStorageStats()
  fileStore.navigateToFolder(null)
  fileStore.fetchTags()

  document.addEventListener('dragover', (e) => {
    e.preventDefault()
    isDragging.value = true
  })
  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      isDragging.value = false
    }
  })
  document.addEventListener('drop', (e) => {
    e.preventDefault()
    isDragging.value = false
    handleDrop(e)
  })
})

const navigateToBreadcrumb = (folderId: number | null) => {
  fileStore.navigateToFolder(folderId)
}

const createFolder = async () => {
  if (!newFolderName.value.trim()) return
  const success = await fileStore.createFolder(newFolderName.value.trim())
  if (success) {
    showCreateFolder.value = false
    newFolderName.value = ''
  }
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  for (const file of Array.from(input.files)) {
    await fileStore.uploadFile(file)
  }
  input.value = ''
}

const handleDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (!files?.length) return

  for (const file of Array.from(files)) {
    await fileStore.uploadFile(file)
  }
}

const handleItemClick = (type: 'file' | 'folder', id: number, event: MouseEvent) => {
  if (event.ctrlKey || event.metaKey) {
    fileStore.toggleSelection(type, id)
  } else if (type === 'file') {
    const file = fileStore.files.find(f => f.id === id)
    if (file) {
      handleFileClick(file)
    }
  }
}

const handleFileClick = async (file: any) => {
  if (file.isPreviewable) {
    const token = localStorage.getItem('token')
    window.open(`/api/files/${file.id}/preview?token=${token}`, '_blank')
  } else {
    try {
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response as any]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请重试')
    }
  }
}

const deleteFile = async (fileId: number) => {
  if (confirm('确定要删除这个文件吗？文件将被移至回收站。')) {
    await fileStore.deleteFile(fileId)
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const openShareModal = (file: any) => {
  selectedFile.value = file
  showShareModal.value = true
}

const createShare = async (form: { password: string; expireDays: number; maxDownloads: number }) => {
  if (!selectedFile.value) return
  
  isSharing.value = true
  try {
    const result = await fileStore.createShare(selectedFile.value.id, {
      password: form.password || undefined,
      expireDays: form.expireDays || undefined,
      maxDownloads: form.maxDownloads || undefined,
    })
    
    if (result) {
      shareResult.value = result
      showShareModal.value = false
    }
  } finally {
    isSharing.value = false
  }
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    fileStore.navigateToFolder(fileStore.currentFolderId)
    return
  }
  
  const result = await fileStore.searchFiles({
    keyword: searchKeyword.value,
    sortBy: fileStore.sortBy,
    sortOrder: fileStore.sortOrder,
  })
  
  if (result) {
    fileStore.files = result.files
  }
}

const handleToggleStar = async (type: 'file' | 'folder', id: number) => {
  if (type === 'file') {
    await fileStore.toggleFileStar(id)
  } else {
    await fileStore.toggleFolderStar(id)
  }
}

const handleBatchDelete = async () => {
  if (!confirm(`确定要删除选中的 ${fileStore.selectedItems.length} 个项目吗？`)) return
  
  const fileIds = fileStore.selectedItems.filter(i => i.type === 'file').map(i => i.id)
  const folderIds = fileStore.selectedItems.filter(i => i.type === 'folder').map(i => i.id)
  
  await fileStore.batchDelete(fileIds, folderIds)
  fileStore.clearSelection()
}

const handleBatchStar = async (starred: boolean) => {
  const fileIds = fileStore.selectedItems.filter(i => i.type === 'file').map(i => i.id)
  const folderIds = fileStore.selectedItems.filter(i => i.type === 'folder').map(i => i.id)
  
  await fileStore.batchStar(fileIds, folderIds, starred)
  fileStore.clearSelection()
}
</script>

<style scoped>
.drive-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.batch-actions {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
}

.batch-btn {
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.batch-btn.select-all {
  color: var(--color-primary);
  background: rgba(59, 130, 246, 0.1);
}

.batch-btn.cancel {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.batch-btn.star {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.batch-btn.delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--border-primary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 5rem 0;
}

.empty-icon {
  width: 6rem;
  height: 6rem;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(59, 130, 246, 0.1);
}

.drag-hint {
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  background: var(--bg-elevated);
  border: 2px dashed var(--color-primary);
}

.upload-progress {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 1rem;
  width: 20rem;
  border-radius: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-lg);
}

.error-toast {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  color: white;
  background: var(--color-danger);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>
