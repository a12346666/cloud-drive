<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden">
    <!-- 动态背景 -->
    <div class="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      <div class="absolute inset-0 bg-black/20"></div>
      <!-- 浮动气泡效果 -->
      <div class="absolute inset-0 overflow-hidden">
        <div v-for="i in 6" :key="i" class="bubble" :style="{ 
          left: `${i * 15}%`, 
          animationDelay: `${i * 0.5}s`,
          width: `${Math.random() * 100 + 50}px`,
          height: `${Math.random() * 100 + 50}px`
        }"></div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="w-full max-w-md relative z-10 p-4">
      <!-- Logo -->
      <div class="text-center mb-8 animate-fade-in">
        <div class="logo-container mx-auto mb-6">
          <div class="logo-glow"></div>
          <div class="logo-icon">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
        </div>
        <h1 class="text-4xl font-bold text-white mb-2 tracking-tight">Cloud Drive</h1>
        <p class="text-white/70 text-lg">安全 · 高效 · 智能</p>
      </div>

      <!-- Login Card -->
      <div class="glass-card p-8 animate-slide-up">
        <h2 class="text-2xl font-semibold text-center mb-2 text-gray-800">欢迎回来</h2>
        <p class="text-center text-gray-500 mb-6 text-sm">登录您的云端存储空间</p>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- 用户名 -->
          <div class="input-group">
            <label class="input-label">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              用户名或邮箱
            </label>
            <input v-model="form.username" type="text" class="input-glass" placeholder="请输入用户名或邮箱"
              required />
          </div>

          <!-- 密码 -->
          <div class="input-group">
            <label class="input-label">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              密码
            </label>
            <div class="relative">
              <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input-glass pr-10"
                placeholder="请输入密码" required />
              <button type="button" @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 验证码 -->
          <div class="input-group">
            <label class="input-label">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              验证码
            </label>
            <div class="flex gap-3">
              <input v-model="form.captchaCode" type="text" class="input-glass flex-1" placeholder="请输入验证码"
                maxlength="4" required />
              <div @click="refreshCaptcha" class="captcha-container cursor-pointer" title="点击刷新">
                <img v-if="captchaUrl" :src="captchaUrl" alt="验证码" class="captcha-image" />
                <div v-else class="captcha-loading">
                  <div class="loading-spinner-sm"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="authStore.error" class="error-message">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ authStore.error }}
          </div>

          <!-- 登录按钮 -->
          <button type="submit" class="btn-primary w-full" :disabled="authStore.loading || !captchaId">
            <span v-if="authStore.loading" class="loading-spinner mr-2"></span>
            <span v-else class="btn-icon mr-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </span>
            {{ authStore.loading ? '登录中...' : '安全登录' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-gray-600">
            还没有账号？
            <router-link to="/register" class="link-primary">
              立即注册
            </router-link>
          </p>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="text-center mt-8 text-white/50 text-sm">
        <p>© 2024 Cloud Drive. 安全云端存储服务</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const router = useRouter()
const authStore = useAuthStore()

const showPassword = ref(false)
const captchaUrl = ref('')
const captchaId = ref('')

const form = reactive({
  username: '',
  password: '',
  captchaCode: '',
})

// 获取验证码
const refreshCaptcha = async () => {
  try {
    const response = await api.get('/auth/captcha')
    if (response.success) {
      captchaId.value = response.data.captchaId
      captchaUrl.value = response.data.captchaImage
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
  }
}

const handleLogin = async () => {
  if (!captchaId.value) {
    authStore.error = '请等待验证码加载完成'
    return
  }

  const success = await authStore.login({
    username: form.username,
    password: form.password,
    captchaId: captchaId.value,
    captchaCode: form.captchaCode,
  })

  if (success) {
    router.push('/drive')
  } else {
    // 登录失败后刷新验证码
    form.captchaCode = ''
    refreshCaptcha()
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<style scoped>
/* 动态背景气泡 */
.bubble {
  position: absolute;
  bottom: -100px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float-up 15s infinite ease-in-out;
  backdrop-filter: blur(2px);
}

@keyframes float-up {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }

  10% {
    opacity: 0.6;
  }

  90% {
    opacity: 0.6;
  }

  100% {
    transform: translateY(-120vh) rotate(720deg);
    opacity: 0;
  }
}

/* Logo 动画 */
.logo-container {
  position: relative;
  width: 80px;
  height: 80px;
}

.logo-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  border-radius: 24px;
  filter: blur(20px);
  opacity: 0.6;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }

  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.logo-icon {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(59, 130, 246, 0.4);
}

/* 玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

/* 输入框样式 */
.input-group {
  @apply space-y-1.5;
}

.input-label {
  @apply flex items-center gap-2 text-sm font-medium text-gray-700;
}

.input-glass {
  @apply w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 placeholder-gray-400 transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white;
}

/* 验证码 */
.captcha-container {
  @apply flex-shrink-0 w-28 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200;
  @apply hover:border-blue-400 transition-colors;
}

.captcha-image {
  @apply w-full h-full object-cover;
}

.captcha-loading {
  @apply w-full h-full flex items-center justify-center;
}

/* 错误消息 */
.error-message {
  @apply flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100;
}

/* 主要按钮 */
.btn-primary {
  @apply relative flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-white overflow-hidden;
  @apply bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500;
  @apply hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02];
  @apply active:scale-[0.98];
  @apply disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100;
  @apply transition-all duration-200;
}

.btn-primary::before {
  content: '';
  @apply absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 opacity-0;
  @apply transition-opacity duration-300;
}

.btn-primary:hover::before {
  @apply opacity-100;
}

.btn-primary span {
  @apply relative z-10;
}

.btn-icon {
  @apply inline-flex;
}

/* 链接样式 */
.link-primary {
  @apply text-blue-600 hover:text-purple-600 font-semibold transition-colors;
  @apply hover:underline decoration-2 underline-offset-4;
}

/* 加载动画 */
.loading-spinner-sm {
  @apply w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 入场动画 */
.animate-fade-in {
  animation: fade-in 0.8s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.6s ease-out 0.2s both;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
