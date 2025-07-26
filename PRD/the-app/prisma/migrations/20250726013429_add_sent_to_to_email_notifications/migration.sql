-- AlterTable
ALTER TABLE `email_notifications` ADD COLUMN `sentTo` VARCHAR(191) NULL,
    MODIFY `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `email_notifications_sentTo_idx` ON `email_notifications`(`sentTo`);
