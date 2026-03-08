/**
 * 安全配置
 * 集中管理所有安全相关的配置
 */

export const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production')
      }
      console.warn('[安全警告] 使用默认JWT密钥，生产环境请设置JWT_SECRET环境变量')
      return 'dev-secret-key-change-in-production-' + Date.now()
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: '30d',
  },

  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    bcryptRounds: 12,
  },

  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 5 : 20,
      lockoutDuration: 30 * 60 * 1000,
      maxAttempts: 5,
    },
    upload: {
      windowMs: 60 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 20 : 100,
    },
  },

  fileUpload: {
    maxFileSize: 500 * 1024 * 1024,
    maxFileSizeMB: 500,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml',
      'application/octet-stream',
    ],
    dangerousExtensions: [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.msi', '.msp', '.cpl', '.dll', '.ocx', '.sys', '.drv',
      '.sh', '.bash', '.zsh', '.ksh',
      '.ps1', '.ps2', '.psm1', '.psd1',
      '.app', '.dmg', '.pkg', '.deb', '.rpm',
      '.hta', '.wsf', '.wsh', '.sct',
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
      '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv',
      '.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.json', '.xml', '.html', '.css', '.js',
      '.zip', '.rar', '.7z', '.tar', '.gz',
      '.md', '.rtf', '.odt', '.ods', '.odp',
    ],
  },

  pathTraversal: {
    blockedPatterns: [
      '../', '..\\', '..',
      '%2e%2e%2f', '%2e%2e/', '..%2f', '%2e%2e%5c',
      '%252e%252e%255c', '..%255c', '%c0%ae', '%c1%1c',
    ],
  },

  xss: {
    blockedPatterns: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<form/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:\s*text\/html/gi,
    ],
  },

  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL || '']
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  },

  csrf: {
    enabled: process.env.NODE_ENV === 'production',
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
  },

  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    httpOnly: true,
  },
}

export default securityConfig
