/**
 * 主题状态管理 - 支持暗色模式
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  // 从本地存储读取主题设置
  const savedTheme = localStorage.getItem('theme') as Theme | null
  const theme = ref<Theme>(savedTheme || 'system')

  // 检测系统主题
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)')

  // 计算当前实际主题
  const currentTheme = computed(() => {
    if (theme.value === 'system') {
      return systemPrefersDark.matches ? 'dark' : 'light'
    }
    return theme.value
  })

  // 是否为暗色模式
  const isDark = computed(() => currentTheme.value === 'dark')

  // 设置主题
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  // 切换主题
  const toggleTheme = () => {
    const newTheme = isDark.value ? 'light' : 'dark'
    setTheme(newTheme)
  }

  // 应用主题到DOM
  const applyTheme = () => {
    const html = document.documentElement

    if (currentTheme.value === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }

    // 更新meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        currentTheme.value === 'dark' ? '#0f172a' : '#ffffff'
      )
    }
  }

  // 监听系统主题变化
  const handleSystemThemeChange = () => {
    if (theme.value === 'system') {
      applyTheme()
    }
  }

  // 初始化
  const init = () => {
    applyTheme()
    systemPrefersDark.addEventListener('change', handleSystemThemeChange)
  }

  // 清理
  const cleanup = () => {
    systemPrefersDark.removeEventListener('change', handleSystemThemeChange)
  }

  // 监听主题变化
  watch(theme, applyTheme)

  return {
    theme,
    currentTheme,
    isDark,
    setTheme,
    toggleTheme,
    init,
    cleanup,
  }
})
