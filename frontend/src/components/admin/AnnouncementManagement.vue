<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color: var(--text-primary);">公告管理</h1>
      <button @click="showCreateModal = true" class="px-4 py-2 rounded-xl text-white font-medium" style="background: var(--color-primary);">发布公告</button>
    </div>

    <div class="space-y-4">
      <div v-for="announcement in announcements" :key="announcement.id" class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold" style="color: var(--text-primary);">{{ announcement.description }}</h3>
            <p class="mt-2" style="color: var(--text-secondary);">{{ announcement.content }}</p>
            <p class="mt-3 text-sm" style="color: var(--text-tertiary);">发布于 {{ formatDate(announcement.createdAt) }}</p>
          </div>
          <div class="flex space-x-2">
            <button @click="editAnnouncement(announcement)" class="px-3 py-1.5 rounded-lg text-xs" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">编辑</button>
            <button @click="deleteAnnouncement(announcement.id)" class="px-3 py-1.5 rounded-lg text-xs" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">删除</button>
          </div>
        </div>
      </div>

      <div v-if="announcements.length === 0" class="text-center py-20" style="color: var(--text-secondary);">
        暂无公告
      </div>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5);" @click.self="showCreateModal = false">
      <div class="p-6 w-full max-w-lg rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">{{ editingId ? '编辑公告' : '发布公告' }}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style="color: var(--text-primary);">标题</label>
            <input v-model="form.title" type="text" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" placeholder="公告标题" />
          </div>
          <div>
            <label class="block text-sm mb-2" style="color: var(--text-primary);">内容</label>
            <textarea v-model="form.content" rows="5" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" placeholder="公告内容"></textarea>
          </div>
          <div class="flex space-x-3">
            <button @click="closeModal" class="flex-1 px-4 py-2 rounded-xl" style="background: var(--bg-tertiary); color: var(--text-primary);">取消</button>
            <button @click="saveAnnouncement" class="flex-1 px-4 py-2 rounded-xl text-white" style="background: var(--color-primary);">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const announcements = ref<any[]>([])
const showCreateModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ title: '', content: '' })

const fetchAnnouncements = async () => {
  try {
    const res = await api.get('/admin/announcements')
    if (res.success) {
      announcements.value = res.data || []
    }
  } catch (error) {
    console.error('获取公告失败:', error)
  }
}

const editAnnouncement = (item: any) => {
  editingId.value = item.id
  form.value = { title: item.description, content: item.content }
  showCreateModal.value = true
}

const closeModal = () => {
  showCreateModal.value = false
  editingId.value = null
  form.value = { title: '', content: '' }
}

const saveAnnouncement = async () => {
  try {
    if (editingId.value) {
      await api.put(`/admin/announcements/${editingId.value}`, form.value)
    } else {
      await api.post('/admin/announcements', form.value)
    }
    closeModal()
    fetchAnnouncements()
  } catch (error) {
    console.error('保存公告失败:', error)
  }
}

const deleteAnnouncement = async (id: number) => {
  if (!confirm('确定要删除此公告吗？')) return
  try {
    await api.delete(`/admin/announcements/${id}`)
    fetchAnnouncements()
  } catch (error) {
    console.error('删除公告失败:', error)
  }
}

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN')

onMounted(fetchAnnouncements)
</script>
