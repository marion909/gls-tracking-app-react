-- CreateTable
CREATE TABLE "app_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "masterPasswordHash" TEXT NOT NULL,
    "masterPasswordSalt" TEXT NOT NULL,
    "glsUsernameEnc" TEXT,
    "glsPasswordEnc" TEXT,
    "encryptionSalt" TEXT,
    "isFirstRun" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tracking_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "lastUpdate" DATETIME,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_events_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "tracking_info" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tracking_info_trackingNumber_key" ON "tracking_info"("trackingNumber");
