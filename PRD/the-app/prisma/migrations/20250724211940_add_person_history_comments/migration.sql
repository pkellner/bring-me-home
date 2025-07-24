-- Add personHistoryId to comments table for linking comments to PersonHistory updates
ALTER TABLE `comments` ADD COLUMN `personHistoryId` VARCHAR(191) NULL;

-- Add foreign key constraint
ALTER TABLE `comments` ADD CONSTRAINT `comments_personHistoryId_fkey` FOREIGN KEY (`personHistoryId`) REFERENCES `person_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX `comments_personHistoryId_idx` ON `comments`(`personHistoryId`);