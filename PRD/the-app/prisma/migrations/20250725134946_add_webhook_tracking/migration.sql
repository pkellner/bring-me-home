-- AlterTable
ALTER TABLE `email_notifications` ADD COLUMN `trackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `webhookEvents` JSON NULL,
    ADD COLUMN `webhookUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `email_templates` ADD COLUMN `trackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `webhookHeaders` JSON NULL,
    ADD COLUMN `webhookUrl` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `email_notifications_messageId_idx` ON `email_notifications`(`messageId`);
