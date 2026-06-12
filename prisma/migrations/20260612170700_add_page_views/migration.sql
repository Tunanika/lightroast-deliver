-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientSlug" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "referrer" TEXT,
    "device" TEXT NOT NULL,
    "browser" TEXT,
    "os" TEXT,
    "userAgent" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PageView_clientSlug_idx" ON "PageView"("clientSlug");

-- CreateIndex
CREATE INDEX "PageView_viewedAt_idx" ON "PageView"("viewedAt");
