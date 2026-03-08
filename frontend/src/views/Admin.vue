<template>
  <div class="min-h-screen theme-transition" style="background-color: var(--bg-primary); color: var(--text-primary);">
    <header class="sticky top-0 z-50 theme-transition" style="background: var(--glass-bg); backdrop-filter: var(--glass-backdrop); border-bottom: 1px solid var(--border-primary);">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-3">
            <router-link to="/" class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span class="text-xl font-semibold theme-transition" style="color: var(--text-primary);">管理后台</span>
            </router-link>
          </div>

          <div class="flex items-center space-x-4">
            <ThemeToggle />
            <router-link
              to="/"
              class="px-4 py-2 rounded-lg text-sm font-medium theme-transition"
              style="color: var(--text-secondary);"
              onmouseover="this.style.background='var(--bg-tertiary)'"
              onmouseout="this.style.background='transparent'"
            >
              返回网盘
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <div class="flex">
      <aside class="w-64 min-h-[calc(100vh-4rem)] p-4 theme-transition" style="background: var(--bg-secondary); border-right: 1px solid var(--border-primary);">
        <nav class="space-y-2">
          <button
            v-for="item in menuItems"
            :key="item.id"
            @click="activeTab = item.id"
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all"
            :style="{
              background: activeTab === item.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === item.id ? 'white' : 'var(--text-primary)'
            }"
            onmouseover="if(activeTab !== item.id) this.style.background='var(--bg-tertiary)'"
            onmouseout="if(activeTab !== item.id) this.style.background='transparent'"
          >
            <component :is="item.icon" class="w-5 h-5" />
            <span>{{ item.name }}</span>
          </button>
        </nav>
      </aside>

      <main class="flex-1 p-6">
        <Dashboard v-if="activeTab === 'dashboard'" />
        <UserManagement v-else-if="activeTab === 'users'" />
        <FileManagement v-else-if="activeTab === 'files'" />
        <AnnouncementManagement v-else-if="activeTab === 'announcements'" />
        <SystemSettings v-else-if="activeTab === 'system'" />
        <SecurityCenter v-else-if="activeTab === 'security'" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import Dashboard from '@/components/admin/Dashboard.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import FileManagement from '@/components/admin/FileManagement.vue'
import AnnouncementManagement from '@/components/admin/AnnouncementManagement.vue'
import SystemSettings from '@/components/admin/SystemSettings.vue'
import SecurityCenter from '@/components/admin/SecurityCenter.vue'

const activeTab = ref('dashboard')

const DashboardIcon = {
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' })
  ])
}

const UsersIcon = {
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
  ])
}

const FilesIcon = {
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z' })
  ])
}

const AnnouncementIcon = {
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' })
  ])
}

const SettingsIcon = {
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
  ])
}

const SecurityIcon = {
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
  ])
}

const menuItems = [
  { id: 'dashboard', name: '仪表盘', icon: DashboardIcon },
  { id: 'users', name: '用户管理', icon: UsersIcon },
  { id: 'files', name: '文件管理', icon: FilesIcon },
  { id: 'announcements', name: '公告管理', icon: AnnouncementIcon },
  { id: 'system', name: '系统设置', icon: SettingsIcon },
  { id: 'security', name: '安全中心', icon: SecurityIcon },
]
</script>
