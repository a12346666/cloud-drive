-- CreateTable
CREATE TABLE "admin_access_consents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "consentType" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "admin_access_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "admin_access_consents_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" INTEGER,
    "targetUserId" INTEGER,
    "details" TEXT,
    "reason" TEXT,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sensitive_operation_codes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sensitive_operation_codes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_access_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "consentType" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "admin_access_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "admin_access_requests_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "admin_access_consents_userId_idx" ON "admin_access_consents"("userId");

-- CreateIndex
CREATE INDEX "admin_access_consents_adminId_idx" ON "admin_access_consents"("adminId");

-- CreateIndex
CREATE INDEX "admin_access_consents_userId_adminId_idx" ON "admin_access_consents"("userId", "adminId");

-- CreateIndex
CREATE INDEX "admin_access_consents_isRevoked_expiresAt_idx" ON "admin_access_consents"("isRevoked", "expiresAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_targetUserId_idx" ON "admin_audit_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_isSensitive_idx" ON "admin_audit_logs"("isSensitive");

-- CreateIndex
CREATE INDEX "sensitive_operation_codes_adminId_code_idx" ON "sensitive_operation_codes"("adminId", "code");

-- CreateIndex
CREATE INDEX "sensitive_operation_codes_expiresAt_idx" ON "sensitive_operation_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_access_requests_userId_idx" ON "admin_access_requests"("userId");

-- CreateIndex
CREATE INDEX "admin_access_requests_adminId_idx" ON "admin_access_requests"("adminId");

-- CreateIndex
CREATE INDEX "admin_access_requests_status_idx" ON "admin_access_requests"("status");
