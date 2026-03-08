-- CreateTable
CREATE TABLE "tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "file_tags" (
    "fileId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("fileId", "tagId"),
    CONSTRAINT "file_tags_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "file_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "starredAt" DATETIME,
    "description" TEXT,
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
INSERT INTO "new_files" ("contentHash", "createdAt", "deletedAt", "deletedBy", "encryptionKey", "extension", "folderId", "id", "isChunked", "isDeleted", "isEncrypted", "iv", "mimeType", "name", "originalName", "originalPath", "path", "refCount", "size", "totalChunks", "updatedAt", "userId") SELECT "contentHash", "createdAt", "deletedAt", "deletedBy", "encryptionKey", "extension", "folderId", "id", "isChunked", "isDeleted", "isEncrypted", "iv", "mimeType", "name", "originalName", "originalPath", "path", "refCount", "size", "totalChunks", "updatedAt", "userId" FROM "files";
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
CREATE INDEX "files_userId_isStarred_idx" ON "files"("userId", "isStarred");
CREATE TABLE "new_folders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "starredAt" DATETIME,
    "userId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" INTEGER,
    "originalParentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_folders" ("createdAt", "deletedAt", "deletedBy", "id", "isDeleted", "name", "originalParentId", "parentId", "updatedAt", "userId") SELECT "createdAt", "deletedAt", "deletedBy", "id", "isDeleted", "name", "originalParentId", "parentId", "updatedAt", "userId" FROM "folders";
DROP TABLE "folders";
ALTER TABLE "new_folders" RENAME TO "folders";
CREATE INDEX "folders_userId_idx" ON "folders"("userId");
CREATE INDEX "folders_userId_isDeleted_idx" ON "folders"("userId", "isDeleted");
CREATE INDEX "folders_userId_parentId_idx" ON "folders"("userId", "parentId");
CREATE INDEX "folders_userId_isDeleted_createdAt_idx" ON "folders"("userId", "isDeleted", "createdAt");
CREATE INDEX "folders_parentId_idx" ON "folders"("parentId");
CREATE INDEX "folders_isDeleted_deletedAt_idx" ON "folders"("isDeleted", "deletedAt");
CREATE INDEX "folders_userId_isStarred_idx" ON "folders"("userId", "isStarred");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");

-- CreateIndex
CREATE INDEX "file_tags_fileId_idx" ON "file_tags"("fileId");

-- CreateIndex
CREATE INDEX "file_tags_tagId_idx" ON "file_tags"("tagId");
