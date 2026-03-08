<template>
  <header class="sticky top-0 z-50 theme-transition" style="background: var(--glass-bg); backdrop-filter: var(--glass-backdrop); border-bottom: 1px solid var(--border-primary);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-blue to-purple-600 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <span class="text-xl font-semibold theme-transition" style="color: var(--text-primary);">Cloud Drive</span>
        </div>

        <div class="flex items-center space-x-4">
          <ThemeToggle />
          
          <router-link
            to="/starred"
            class="nav-link"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>收藏</span>
          </router-link>

          <router-link to="/trash" class="nav-link">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>回收站</span>
          </router-link>

          <router-link to="/shares" class="nav-link">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>我的分享</span>
          </router-link>

          <router-link
            v-if="isAdmin"
            to="/admin"
            class="nav-link"
          >
            管理后台
          </router-link>

          <div class="relative group">
            <button class="flex items-center space-x-2 p-2 rounded-lg theme-transition user-btn">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {{ username?.[0]?.toUpperCase() }}
              </div>
              <span class="text-sm font-medium" style="color: var(--text-primary);">{{ username }}</span>
              <svg class="w-4 h-4" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div class="dropdown-menu">
              <div class="p-2">
                <div class="px-3 py-2 text-xs theme-transition border-b mb-1" style="color: var(--text-secondary); border-color: var(--border-primary);">
                  {{ email }}
                </div>
                <button
                  @click="$emit('logout')"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/10 text-red-500"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import ThemeToggle from '@/components/ThemeToggle.vue'

defineProps<{
  username?: string
  email?: string
  isAdmin: boolean
}>()

defineEmits<{
  logout: []
}>()
</script>

<style scoped>
.nav-link {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.user-btn {
  color: var(--text-secondary);
}

.user-btn:hover {
  background: var(--bg-tertiary);
}

.dropdown-menu {
  position: absolute;
  right: 0;
  margin-top: 0.5rem;
  width: 12rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
  z-index: 50;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
}

.group:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
}
</style>
