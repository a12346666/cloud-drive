/**
 * 路由配置
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: '/drive',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { guest: true },
  },
  {
    path: '/drive',
    name: 'Drive',
    component: () => import('@/views/Drive.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/drive/folder/:id',
    name: 'Folder',
    component: () => import('@/views/Drive.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/shares',
    name: 'Shares',
    component: () => import('@/views/Shares.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/starred',
    name: 'Starred',
    component: () => import('@/views/Starred.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/trash',
    name: 'Trash',
    component: () => import('@/views/Trash.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/share/:id',
    name: 'ShareView',
    component: () => import('@/views/ShareView.vue'),
    // 分享页面允许所有人访问，不设置 guest 或 requiresAuth
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果已登录但未获取用户信息，先获取
  if (authStore.token && !authStore.user) {
    await authStore.fetchUser()
  }

  // 需要登录的页面
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
    return
  }

  // 需要管理员权限的页面
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/drive')
    return
  }

  // 游客页面(登录/注册)，已登录用户重定向
  if (to.meta.guest && authStore.isLoggedIn) {
    next('/drive')
    return
  }

  next()
})

export default router
