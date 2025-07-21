-- AlterTable
ALTER TABLE `comments` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` TEXT NULL;
