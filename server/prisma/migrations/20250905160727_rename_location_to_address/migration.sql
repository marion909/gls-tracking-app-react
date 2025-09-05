/*
  Warnings:

  - You are about to drop the column `location` on the `tracking_info` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tracking_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "address" TEXT,
    "lastUpdate" DATETIME,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_tracking_info" ("createdAt", "customerName", "id", "isOverdue", "lastUpdate", "status", "trackingNumber", "updatedAt") SELECT "createdAt", "customerName", "id", "isOverdue", "lastUpdate", "status", "trackingNumber", "updatedAt" FROM "tracking_info";
DROP TABLE "tracking_info";
ALTER TABLE "new_tracking_info" RENAME TO "tracking_info";
CREATE UNIQUE INDEX "tracking_info_trackingNumber_key" ON "tracking_info"("trackingNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
