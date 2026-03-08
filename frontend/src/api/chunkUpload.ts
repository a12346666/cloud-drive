/**
 * 分片上传API
 * 支持断点续传、秒传、大文件上传
 */

import api from './axios'

// 分片大小 5MB
export const CHUNK_SIZE = 5 * 1024 * 1024

/**
 * 计算文件MD5哈希
 * @param file 文件对象
 * @param onProgress 进度回调
 * @returns MD5哈希值
 */
export const calculateFileHash = (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = []
    let currentChunk = 0
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    // 读取文件分片
    while (currentChunk < totalChunks) {
      const start = currentChunk * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      chunks.push(file.slice(start, end))
      currentChunk++
    }

    // 使用Web Worker计算哈希（避免阻塞主线程）
    const workerCode = `
      self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js')
      
      self.onmessage = async (e) => {
        const { chunks } = e.data
        const spark = new self.SparkMD5.ArrayBuffer()
        
        for (let i = 0; i < chunks.length; i++) {
          const buffer = await chunks[i].arrayBuffer()
          spark.append(buffer)
          self.postMessage({ type: 'progress', percent: Math.round(((i + 1) / chunks.length) * 100) })
        }
        
        const hash = spark.end()
        self.postMessage({ type: 'complete', hash })
      }
    `

    // 创建Blob URL
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    const worker = new Worker(workerUrl)

    worker.onmessage = (e) => {
      const { type, percent, hash } = e.data
      if (type === 'progress' && onProgress) {
        onProgress(percent)
      } else if (type === 'complete') {
        URL.revokeObjectURL(workerUrl)
        worker.terminate()
        resolve(hash)
      }
    }

    worker.onerror = (error) => {
      URL.revokeObjectURL(workerUrl)
      worker.terminate()
      reject(error)
    }

    worker.postMessage({ chunks })
  })
}

/**
 * 计算单个分片的MD5哈希
 * @param chunk 分片Blob
 * @returns MD5哈希值
 */
export const calculateChunkHash = (chunk: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      if (!buffer) {
        reject(new Error('读取分片失败'))
        return
      }
      
      // 使用简单的哈希计算
      const wordArray = CryptoJS.lib.WordArray.create(buffer as any)
      const hash = CryptoJS.MD5(wordArray).toString()
      resolve(hash)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(chunk)
  })
}

// 使用crypto-js进行MD5计算（备用方案）
import CryptoJS from 'crypto-js'

/**
 * 初始化分片上传
 * @param params 初始化参数
 */
export const initChunkUpload = async (params: {
  fileName: string
  fileSize: number
  fileHash: string
  mimeType: string
  folderId?: number
  encrypt?: boolean
}) => {
  const response = await api.post('/files/chunk/init', params)
  return response
}

/**
 * 上传单个分片
 * @param params 分片参数
 * @param onProgress 进度回调
 */
export const uploadChunk = async (
  params: {
    uploadId: string
    chunkIndex: number
    chunkHash: string
    chunk: Blob
  },
  onProgress?: (percent: number) => void
) => {
  const { uploadId, chunkIndex, chunkHash, chunk } = params

  const formData = new FormData()
  formData.append('file', chunk, `chunk_${chunkIndex}`)
  formData.append('uploadId', uploadId)
  formData.append('chunkIndex', chunkIndex.toString())
  formData.append('chunkHash', chunkHash)

  const response = await api.post('/files/chunk/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
    },
  })

  return response
}

/**
 * 合并分片
 * @param params 合并参数
 */
export const mergeChunks = async (params: {
  uploadId: string
  fileName: string
  fileHash: string
  fileSize: number
  mimeType: string
  totalChunks: number
  folderId?: number
  encrypt?: boolean
}) => {
  const response = await api.post('/files/chunk/merge', params)
  return response
}

/**
 * 检查上传进度
 * @param uploadId 上传会话ID
 */
export const checkUploadProgress = async (uploadId: string) => {
  const response = await api.get(`/files/chunk/progress/${uploadId}`)
  return response
}

/**
 * 取消上传
 * @param uploadId 上传会话ID
 */
export const cancelUpload = async (uploadId: string) => {
  const response = await api.delete(`/files/chunk/cancel/${uploadId}`)
  return response
}

/**
 * 秒传检查
 * @param fileHash 文件哈希
 * @param fileSize 文件大小
 */
export const checkFileExists = async (fileHash: string, fileSize?: number) => {
  const response = await api.post('/files/chunk/check', {
    fileHash,
    fileSize,
  })
  return response
}

/**
 * 分片上传任务类
 * 管理整个分片上传流程
 */
export class ChunkUploadTask {
  private file: File
  private folderId?: number
  private encrypt: boolean
  private uploadId: string = ''
  private fileHash: string = ''
  private chunks: Blob[] = []
  private uploadedChunks: Set<number> = new Set()
  private totalChunks: number = 0
  private isPaused: boolean = false
  private isCancelled: boolean = false
  private retryCount: number = 3
  private retryDelay: number = 1000

  // 回调函数
  public onHashProgress?: (percent: number) => void
  public onUploadProgress?: (percent: number) => void
  public onChunkUploaded?: (chunkIndex: number, totalChunks: number) => void
  public onComplete?: (result: any) => void
  public onError?: (error: Error) => void
  public onDuplicate?: (file: any) => void

  constructor(file: File, options?: { folderId?: number; encrypt?: boolean }) {
    this.file = file
    this.folderId = options?.folderId
    this.encrypt = options?.encrypt || false
    this.totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    this.prepareChunks()
  }

  /**
   * 准备文件分片
   */
  private prepareChunks() {
    this.chunks = []
    for (let i = 0; i < this.totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, this.file.size)
      this.chunks.push(this.file.slice(start, end))
    }
  }

  /**
   * 开始上传
   */
  async start(): Promise<void> {
    try {
      // 1. 计算文件哈希
      this.fileHash = await this.calculateFileHash()
      
      // 2. 秒传检查
      const checkResult = await checkFileExists(this.fileHash, this.file.size)
      if (checkResult.data?.exists) {
        this.onDuplicate?.(checkResult.data.file)
        this.onComplete?.(checkResult.data)
        return
      }

      // 3. 初始化上传
      const initResult = await initChunkUpload({
        fileName: this.file.name,
        fileSize: this.file.size,
        fileHash: this.fileHash,
        mimeType: this.file.type || 'application/octet-stream',
        folderId: this.folderId,
        encrypt: this.encrypt,
      })

      if (initResult.data?.isDuplicate) {
        this.onDuplicate?.(initResult.data.file)
        this.onComplete?.(initResult.data)
        return
      }

      this.uploadId = initResult.data.uploadId
      
      // 4. 检查已上传的分片
      if (initResult.data?.uploadedChunks) {
        initResult.data.uploadedChunks.forEach((index: number) => {
          this.uploadedChunks.add(index)
        })
      }

      // 5. 上传未上传的分片
      await this.uploadChunks()

      // 6. 合并分片
      const mergeResult = await mergeChunks({
        uploadId: this.uploadId,
        fileName: this.file.name,
        fileHash: this.fileHash,
        fileSize: this.file.size,
        mimeType: this.file.type || 'application/octet-stream',
        totalChunks: this.totalChunks,
        folderId: this.folderId,
        encrypt: this.encrypt,
      })

      this.onComplete?.(mergeResult.data)
    } catch (error) {
      this.onError?.(error as Error)
    }
  }

  /**
   * 计算文件哈希
   */
  private async calculateFileHash(): Promise<string> {
    return calculateFileHash(this.file, (percent) => {
      this.onHashProgress?.(percent)
    })
  }

  /**
   * 上传所有未上传的分片
   */
  private async uploadChunks(): Promise<void> {
    for (let i = 0; i < this.totalChunks; i++) {
      // 检查是否已上传
      if (this.uploadedChunks.has(i)) {
        this.updateProgress()
        continue
      }

      // 检查是否暂停或取消
      if (this.isCancelled) {
        throw new Error('上传已取消')
      }

      while (this.isPaused) {
        await this.sleep(100)
        if (this.isCancelled) {
          throw new Error('上传已取消')
        }
      }

      // 上传分片（带重试）
      await this.uploadChunkWithRetry(i)
      
      this.uploadedChunks.add(i)
      this.onChunkUploaded?.(i, this.totalChunks)
      this.updateProgress()
    }
  }

  /**
   * 上传单个分片（带重试）
   */
  private async uploadChunkWithRetry(chunkIndex: number): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        await this.uploadChunk(chunkIndex)
        return
      } catch (error) {
        lastError = error as Error
        console.warn(`分片 ${chunkIndex} 上传失败，第 ${attempt + 1} 次重试...`)
        await this.sleep(this.retryDelay * (attempt + 1))
      }
    }
    
    throw lastError || new Error(`分片 ${chunkIndex} 上传失败`)
  }

  /**
   * 上传单个分片
   */
  private async uploadChunk(chunkIndex: number): Promise<void> {
    const chunk = this.chunks[chunkIndex]
    const chunkHash = await this.calculateChunkHash(chunk)

    await uploadChunk(
      {
        uploadId: this.uploadId,
        chunkIndex,
        chunkHash,
        chunk,
      },
      (percent) => {
        // 单个分片进度
      }
    )
  }

  /**
   * 计算分片哈希
   */
  private async calculateChunkHash(chunk: Blob): Promise<string> {
    const buffer = await chunk.arrayBuffer()
    const wordArray = CryptoJS.lib.WordArray.create(buffer as any)
    return CryptoJS.MD5(wordArray).toString()
  }

  /**
   * 更新上传进度
   */
  private updateProgress() {
    const percent = Math.round((this.uploadedChunks.size / this.totalChunks) * 100)
    this.onUploadProgress?.(percent)
  }

  /**
   * 暂停上传
   */
  pause() {
    this.isPaused = true
  }

  /**
   * 恢复上传
   */
  resume() {
    this.isPaused = false
  }

  /**
   * 取消上传
   */
  async cancel() {
    this.isCancelled = true
    if (this.uploadId) {
      await cancelUpload(this.uploadId)
    }
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
