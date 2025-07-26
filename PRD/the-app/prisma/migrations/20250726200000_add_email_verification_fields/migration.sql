-- AlterTable
ALTER TABLE `users` ADD COLUMN `emailVerified` DATETIME(3) NULL,
    ADD COLUMN `emailVerificationToken` VARCHAR(191) NULL,
    ADD COLUMN `emailVerificationExpires` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_emailVerificationToken_key` ON `users`(`emailVerificationToken`);