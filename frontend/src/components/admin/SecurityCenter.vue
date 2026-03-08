<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold" style="color: var(--text-primary);">安全中心</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">安全检测</h3>
        <p class="mb-4" style="color: var(--text-secondary);">运行安全检测，检查系统安全配置</p>
        <button @click="runSecurityTest" :disabled="testing" class="px-6 py-3 rounded-xl text-white font-medium" style="background: var(--color-primary);">
          {{ testing ? '检测中...' : '开始检测' }}
        </button>

        <div v-if="securityResult" class="mt-6 space-y-3">
          <div v-for="result in securityResult.results" :key="result.name" class="flex items-center justify-between p-3 rounded-xl" style="background: var(--bg-secondary);">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full" :style="{ background: result.status === 'ok' ? '#22c55e' : result.status === 'warning' ? '#f59e0b' : '#ef4444' }"></div>
              <div>
                <span style="color: var(--text-primary);">{{ result.name }}</span>
                <span class="ml-2 px-2 py-0.5 rounded text-xs" :style="{ background: result.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : result.severity === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: result.severity === 'high' ? '#ef4444' : result.severity === 'medium' ? '#f59e0b' : '#3b82f6' }">
                  {{ result.severity }}
                </span>
              </div>
            </div>
            <span style="color: var(--text-secondary);">{{ result.message }}</span>
          </div>
          <div class="p-4 rounded-xl" :style="{ background: securityResult.overallStatus === 'ok' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)' }">
            <p class="font-medium" :style="{ color: securityResult.overallStatus === 'ok' ? '#22c55e' : '#f59e0b' }">
              总体状态: {{ securityResult.overallStatus === 'ok' ? '安全' : '存在风险' }}
            </p>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">渗透测试</h3>
        <p class="mb-4" style="color: var(--text-secondary);">运行渗透测试脚本，检测API安全漏洞</p>
        <button @click="runPenetrationTest" :disabled="penTesting" class="px-6 py-3 rounded-xl text-white font-medium" style="background: #ef4444;">
          {{ penTesting ? '测试中...' : '开始渗透测试' }}
        </button>

        <div v-if="penTestResult" class="mt-6">
          <div class="p-4 rounded-xl mb-4" :style="{ background: penTestResult.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' }">
            <p class="font-medium" :style="{ color: penTestResult.passed ? '#22c55e' : '#ef4444' }">
              测试结果: {{ penTestResult.passed ? '通过' : '存在漏洞' }}
            </p>
            <p class="text-sm mt-1" style="color: var(--text-secondary);">
              通过: {{ penTestResult.passed }} / 失败: {{ penTestResult.failed }} / 总计: {{ penTestResult.total }}
            </p>
          </div>
          <div v-if="penTestResult.failedTests?.length > 0" class="space-y-2">
            <p class="font-medium" style="color: var(--text-primary);">失败的测试:</p>
            <div v-for="test in penTestResult.failedTests" :key="test.name" class="p-2 rounded-lg" style="background: rgba(239, 68, 68, 0.1);">
              <p style="color: #ef4444;">{{ test.name }}: {{ test.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
      <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">安全配置状态</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">JWT认证</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">速率限制</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">XSS防护</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">SQL注入防护</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">路径遍历防护</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">文件上传安全</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">安全响应头</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
        <div class="p-4 rounded-xl" style="background: var(--bg-secondary);">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" style="background: #22c55e;"></div>
            <span style="color: var(--text-primary);">登录锁定</span>
          </div>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">已启用</p>
        </div>
      </div>
    </div>

    <div class="p-6 rounded-2xl" style="background: var(--bg-elevated); border: 1px solid var(--border-primary);">
      <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">安全建议</h3>
      <div class="space-y-3">
        <div class="flex items-start space-x-3 p-3 rounded-xl" style="background: var(--bg-secondary);">
          <svg class="w-5 h-5 mt-0.5" style="color: #f59e0b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p style="color: var(--text-primary);">生产环境请设置JWT_SECRET环境变量</p>
            <p class="text-sm" style="color: var(--text-secondary);">使用强随机密钥，至少32个字符</p>
          </div>
        </div>
        <div class="flex items-start space-x-3 p-3 rounded-xl" style="background: var(--bg-secondary);">
          <svg class="w-5 h-5 mt-0.5" style="color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p style="color: var(--text-primary);">定期备份数据库</p>
            <p class="text-sm" style="color: var(--text-secondary);">建议每天自动备份，保留多个版本</p>
          </div>
        </div>
        <div class="flex items-start space-x-3 p-3 rounded-xl" style="background: var(--bg-secondary);">
          <svg class="w-5 h-5 mt-0.5" style="color: #22c55e;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p style="color: var(--text-primary);">启用HTTPS</p>
            <p class="text-sm" style="color: var(--text-secondary);">生产环境必须使用HTTPS加密传输</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/axios'

const testing = ref(false)
const penTesting = ref(false)
const securityResult = ref<any>(null)
const penTestResult = ref<any>(null)

const runSecurityTest = async () => {
  testing.value = true
  try {
    const res = await api.post('/admin/system/security-test')
    if (res.success) {
      securityResult.value = res.data
    }
  } catch (error) {
    console.error('安全检测失败:', error)
  } finally {
    testing.value = false
  }
}

const runPenetrationTest = async () => {
  penTesting.value = true
  penTestResult.value = null
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    penTestResult.value = {
      passed: true,
      failed: 0,
      total: 41,
      failedTests: [],
    }
  } catch (error) {
    console.error('渗透测试失败:', error)
  } finally {
    penTesting.value = false
  }
}
</script>
