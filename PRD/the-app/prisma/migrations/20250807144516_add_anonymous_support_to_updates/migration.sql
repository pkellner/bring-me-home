-- AlterTable
ALTER TABLE `anonymous_support` ADD COLUMN `personHistoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `optOutNotes` TEXT NULL;

-- CreateIndex
CREATE INDEX `anonymous_support_personHistoryId_idx` ON `anonymous_support`(`personHistoryId`);

-- AddForeignKey
ALTER TABLE `anonymous_support` ADD CONSTRAINT `anonymous_support_personHistoryId_fkey` FOREIGN KEY (`personHistoryId`) REFERENCES `person_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
