-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DownloadEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "clientSlug" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'download',
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "downloadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DownloadEvent_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DownloadEvent" ("clientSlug", "downloadedAt", "fileId", "id", "ip", "userAgent") SELECT "clientSlug", "downloadedAt", "fileId", "id", "ip", "userAgent" FROM "DownloadEvent";
DROP TABLE "DownloadEvent";
ALTER TABLE "new_DownloadEvent" RENAME TO "DownloadEvent";
CREATE INDEX "DownloadEvent_fileId_idx" ON "DownloadEvent"("fileId");
CREATE INDEX "DownloadEvent_clientSlug_idx" ON "DownloadEvent"("clientSlug");
CREATE INDEX "DownloadEvent_downloadedAt_idx" ON "DownloadEvent"("downloadedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
