-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "cctvs" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "lastPing" TIMESTAMP(3),
ADD COLUMN     "roadSegment" TEXT,
ADD COLUMN     "sector" TEXT DEFAULT 'Sector 7';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "detectionMetadata" JSONB,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "videoClipUrl" TEXT;

-- CreateTable
CREATE TABLE "incident_histories" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_histories_incidentId_idx" ON "incident_histories"("incidentId");

-- CreateIndex
CREATE INDEX "notification_logs_incidentId_idx" ON "notification_logs"("incidentId");

-- CreateIndex
CREATE INDEX "incidents_detectedAt_idx" ON "incidents"("detectedAt");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- AddForeignKey
ALTER TABLE "incident_histories" ADD CONSTRAINT "incident_histories_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
