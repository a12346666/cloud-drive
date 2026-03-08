-- CreateTable
CREATE TABLE "file_chunks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chunkIndex" INTEGER NOT NULL,
    "chunkHash" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "fileId" INTEGER,
    "userId" INTEGER NOT NULL,
    "uploadId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_chunks_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "file_chunks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT,
    "contentHash" TEXT,
    "refCount" INTEGER NOT NULL DEFAULT 1,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionKey" TEXT,
    "iv" TEXT,
    "isChunked" BOOLEAN NOT NULL DEFAULT false,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "folderId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "originalPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_files" ("createdAt", "deletedAt", "deletedBy", "encryptionKey", "extension", "folderId", "id", "isDeleted", "isEncrypted", "iv", "mimeType", "name", "originalName", "originalPath", "path", "size", "updatedAt", "userId") SELECT "createdAt", "deletedAt", "deletedBy", "encryptionKey", "extension", "folderId", "id", "isDeleted", "isEncrypted", "iv", "mimeType", "name", "originalName", "originalPath", "path", "size", "updatedAt", "userId" FROM "files";
DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";
CREATE INDEX "files_userId_idx" ON "files"("userId");
CREATE INDEX "files_userId_isDeleted_idx" ON "files"("userId", "isDeleted");
CREATE INDEX "files_userId_folderId_idx" ON "files"("userId", "folderId");
CREATE INDEX "files_userId_isDeleted_createdAt_idx" ON "files"("userId", "isDeleted", "createdAt");
CREATE INDEX "files_folderId_idx" ON "files"("folderId");
CREATE INDEX "files_mimeType_idx" ON "files"("mimeType");
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");
CREATE INDEX "files_isDeleted_deletedAt_idx" ON "files"("isDeleted", "deletedAt");
CREATE INDEX "files_contentHash_idx" ON "files"("contentHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "file_chunks_uploadId_chunkIndex_idx" ON "file_chunks"("uploadId", "chunkIndex");

-- CreateIndex
CREATE INDEX "file_chunks_userId_idx" ON "file_chunks"("userId");

-- CreateIndex
CREATE INDEX "file_chunks_fileId_idx" ON "file_chunks"("fileId");

-- CreateIndex
CREATE INDEX "file_chunks_uploadId_idx" ON "file_chunks"("uploadId");
