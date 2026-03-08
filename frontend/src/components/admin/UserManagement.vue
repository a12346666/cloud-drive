<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold" style="color: var(--text-primary);">用户管理</h1>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 rounded-xl text-white font-medium"
        style="background: var(--color-primary);"
      >
        创建用户
      </button>
    </div>

    <div class="flex items-center space-x-4">
      <input
        v-model="searchKeyword"
        type="text"
        class="flex-1 px-4 py-2 rounded-xl"
        style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);"
        placeholder="搜索用户名或邮箱..."
        @keyup.enter="fetchUsers"
      />
      <select
        v-model="roleFilter"
        class="px-4 py-2 rounded-xl"
        style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);"
        @change="fetchUsers"
      >
        <option value="">全部角色</option>
        <option value="USER">普通用户</option>
        <option value="ADMIN">管理员</option>
      </select>
    </div>

    <div class="rounded-2xl overflow-hidden" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
      <table class="w-full">
        <thead>
          <tr style="background: var(--bg-secondary);">
            <th class="text-left py-4 px-6 text-sm font-medium" style="color: var(--text-secondary);">用户</th>
            <th class="text-left py-4 px-6 text-sm font-medium" style="color: var(--text-secondary);">角色</th>
            <th class="text-left py-4 px-6 text-sm font-medium" style="color: var(--text-secondary);">存储空间</th>
            <th class="text-left py-4 px-6 text-sm font-medium" style="color: var(--text-secondary);">文件数</th>
            <th class="text-left py-4 px-6 text-sm font-medium" style="color: var(--text-secondary);">状态</th>
            <th class="text-left py-4 px-6 text-sm font-medium" style="color: var(--text-secondary);">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" style="border-bottom: 1px solid var(--border-primary);">
            <td class="py-4 px-6">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6);">
                  {{ user.username?.[0]?.toUpperCase() }}
                </div>
                <div>
                  <p style="color: var(--text-primary);">{{ user.username }}</p>
                  <p class="text-sm" style="color: var(--text-secondary);">{{ user.email }}</p>
                </div>
              </div>
            </td>
            <td class="py-4 px-6">
              <span class="px-3 py-1 rounded-lg text-xs" :style="{ background: user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: user.role === 'ADMIN' ? '#ef4444' : '#3b82f6' }">
                {{ user.role === 'ADMIN' ? '管理员' : '用户' }}
              </span>
            </td>
            <td class="py-4 px-6">
              <div>
                <p style="color: var(--text-primary);">{{ user.storageUsedFormatted }} / {{ user.storageLimitFormatted }}</p>
                <div class="w-24 h-1.5 rounded-full mt-1" style="background: var(--bg-tertiary);">
                  <div class="h-full rounded-full" :style="{ width: `${user.storagePercentage}%`, background: user.storagePercentage > 90 ? '#ef4444' : user.storagePercentage > 70 ? '#f59e0b' : '#3b82f6' }"></div>
                </div>
              </div>
            </td>
            <td class="py-4 px-6" style="color: var(--text-primary);">{{ user.fileCount }} 文件 / {{ user.folderCount }} 文件夹</td>
            <td class="py-4 px-6">
              <span class="px-3 py-1 rounded-lg text-xs" :style="{ background: user.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: user.isActive ? '#22c55e' : '#ef4444' }">
                {{ user.isActive ? '正常' : '禁用' }}
              </span>
            </td>
            <td class="py-4 px-6">
              <div class="flex items-center space-x-2">
                <button @click="openStorageModal(user)" class="px-3 py-1.5 rounded-lg text-xs" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">修改容量</button>
                <button @click="openFilesModal(user)" class="px-3 py-1.5 rounded-lg text-xs" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">查看文件</button>
                <button @click="toggleUserStatus(user)" class="px-3 py-1.5 rounded-lg text-xs" :style="{ background: user.isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: user.isActive ? '#ef4444' : '#22c55e' }">
                  {{ user.isActive ? '禁用' : '启用' }}
                </button>
                <button @click="deleteUser(user)" class="px-3 py-1.5 rounded-lg text-xs" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between">
      <p style="color: var(--text-secondary);">共 {{ total }} 个用户</p>
      <div class="flex items-center space-x-2">
        <button @click="page--" :disabled="page === 1" class="px-3 py-1 rounded-lg" :style="{ background: page === 1 ? 'var(--bg-tertiary)' : 'var(--color-primary)', color: page === 1 ? 'var(--text-tertiary)' : 'white' }">上一页</button>
        <span style="color: var(--text-primary);">{{ page }} / {{ totalPages }}</span>
        <button @click="page++" :disabled="page >= totalPages" class="px-3 py-1 rounded-lg" :style="{ background: page >= totalPages ? 'var(--bg-tertiary)' : 'var(--color-primary)', color: page >= totalPages ? 'var(--text-tertiary)' : 'white' }">下一页</button>
      </div>
    </div>

    <div v-if="showStorageModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5);" @click.self="showStorageModal = false">
      <div class="p-6 w-full max-w-md rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">修改用户容量</h3>
        <p class="mb-4" style="color: var(--text-secondary);">用户: {{ selectedUser?.username }}</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style="color: var(--text-primary);">存储空间限制 (GB)</label>
            <input v-model.number="storageForm.limitGB" type="number" min="1" max="1000" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" />
          </div>
          <div class="flex space-x-3">
            <button @click="showStorageModal = false" class="flex-1 px-4 py-2 rounded-xl" style="background: var(--bg-tertiary); color: var(--text-primary);">取消</button>
            <button @click="updateStorage" class="flex-1 px-4 py-2 rounded-xl text-white" style="background: var(--color-primary);">保存</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showFilesModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5);" @click.self="showFilesModal = false">
      <div class="p-6 w-full max-w-4xl max-h-[80vh] overflow-auto rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary);">用户文件 - {{ selectedUser?.username }}</h3>
          <button @click="showFilesModal = false" style="color: var(--text-secondary);">关闭</button>
        </div>
        <div v-if="userFiles.length === 0" class="text-center py-10" style="color: var(--text-secondary);">暂无文件</div>
        <table v-else class="w-full">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-primary);">
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">文件名</th>
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">大小</th>
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">类型</th>
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">加密</th>
              <th class="text-left py-3 px-4 text-sm" style="color: var(--text-secondary);">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in userFiles" :key="file.id" style="border-bottom: 1px solid var(--border-primary);">
              <td class="py-3 px-4" style="color: var(--text-primary);">{{ file.name }}</td>
              <td class="py-3 px-4" style="color: var(--text-secondary);">{{ file.sizeFormatted }}</td>
              <td class="py-3 px-4" style="color: var(--text-secondary);">{{ file.mimeType }}</td>
              <td class="py-3 px-4">
                <span v-if="file.isEncrypted" class="px-2 py-1 rounded text-xs" style="background: rgba(34, 197, 94, 0.2); color: #22c55e;">已加密</span>
                <span v-else style="color: var(--text-tertiary);">-</span>
              </td>
              <td class="py-3 px-4">
                <button @click="downloadFile(file)" class="px-3 py-1 rounded text-xs" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">下载</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5);" @click.self="showCreateModal = false">
      <div class="p-6 w-full max-w-md rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">创建用户</h3>
        <div class="space-y-4">
          <input v-model="createForm.username" type="text" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" placeholder="用户名" />
          <input v-model="createForm.email" type="email" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" placeholder="邮箱" />
          <input v-model="createForm.password" type="password" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" placeholder="密码" />
          <select v-model="createForm.role" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);">
            <option value="USER">普通用户</option>
            <option value="ADMIN">管理员</option>
          </select>
          <input v-model.number="createForm.storageLimitGB" type="number" min="1" class="w-full px-4 py-2 rounded-xl" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-primary);" placeholder="存储限制 (GB)" />
          <div class="flex space-x-3">
            <button @click="showCreateModal = false" class="flex-1 px-4 py-2 rounded-xl" style="background: var(--bg-tertiary); color: var(--text-primary);">取消</button>
            <button @click="createUser" class="flex-1 px-4 py-2 rounded-xl text-white" style="background: var(--color-primary);">创建</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/api/axios'

const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const totalPages = ref(1)
const searchKeyword = ref('')
const roleFilter = ref('')

const showStorageModal = ref(false)
const showFilesModal = ref(false)
const showCreateModal = ref(false)
const selectedUser = ref<any>(null)
const userFiles = ref<any[]>([])
const storageForm = ref({ limitGB: 10 })
const createForm = ref({
  username: '',
  email: '',
  password: '',
  role: 'USER',
  storageLimitGB: 10,
})

const fetchUsers = async () => {
  try {
    const res = await api.get('/admin/users', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchKeyword.value,
        role: roleFilter.value,
      },
    })
    if (res.success) {
      users.value = res.data.users || res.data || []
      total.value = res.data.pagination?.total || res.pagination?.total || 0
      totalPages.value = res.data.pagination?.totalPages || res.pagination?.totalPages || 1
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

const openStorageModal = (user: any) => {
  selectedUser.value = user
  storageForm.value.limitGB = Math.round(user.storageLimit / (1024 * 1024 * 1024))
  showStorageModal.value = true
}

const updateStorage = async () => {
  try {
    const limitBytes = storageForm.value.limitGB * 1024 * 1024 * 1024
    await api.put(`/admin/users/${selectedUser.value.id}/storage`, {
      storageLimit: limitBytes,
    })
    showStorageModal.value = false
    fetchUsers()
  } catch (error) {
    console.error('更新存储空间失败:', error)
  }
}

const openFilesModal = async (user: any) => {
  selectedUser.value = user
  try {
    const res = await api.get(`/admin/users/${user.id}/files`)
    if (res.success) {
      userFiles.value = res.data.files || []
      showFilesModal.value = true
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      alert('需要用户授权才能查看其文件')
    }
    console.error('获取用户文件失败:', error)
  }
}

const downloadFile = async (file: any) => {
  try {
    const res = await api.get(`/admin/files/${file.id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res as any]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', file.name)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    alert(error.response?.data?.message || '下载失败')
  }
}

const toggleUserStatus = async (user: any) => {
  try {
    await api.put(`/admin/users/${user.id}`, {
      isActive: !user.isActive,
    })
    fetchUsers()
  } catch (error) {
    console.error('更新用户状态失败:', error)
  }
}

const deleteUser = async (user: any) => {
  if (!confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复。`)) return
  try {
    await api.delete(`/admin/users/${user.id}`)
    fetchUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
  }
}

const createUser = async () => {
  try {
    await api.post('/admin/users', {
      ...createForm.value,
      storageLimit: createForm.value.storageLimitGB * 1024 * 1024 * 1024,
    })
    showCreateModal.value = false
    createForm.value = { username: '', email: '', password: '', role: 'USER', storageLimitGB: 10 }
    fetchUsers()
  } catch (error) {
    console.error('创建用户失败:', error)
  }
}

watch(page, fetchUsers)
onMounted(fetchUsers)
</script>
