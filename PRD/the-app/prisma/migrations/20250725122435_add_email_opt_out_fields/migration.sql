-- AlterTable
ALTER TABLE `users` ADD COLUMN `optOutOfAllEmail` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `email_opt_outs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_opt_outs_userId_personId_key`(`userId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `personHistoryId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `htmlContent` TEXT NOT NULL,
    `textContent` TEXT NULL,
    `status` ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED') NOT NULL DEFAULT 'QUEUED',
    `provider` VARCHAR(191) NULL,
    `messageId` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `scheduledFor` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `email_notifications_status_scheduledFor_idx`(`status`, `scheduledFor`),
    INDEX `email_notifications_userId_idx`(`userId`),
    INDEX `email_notifications_personId_idx`(`personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_opt_outs` ADD CONSTRAINT `email_opt_outs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_opt_outs` ADD CONSTRAINT `email_opt_outs_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_notifications` ADD CONSTRAINT `email_notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_notifications` ADD CONSTRAINT `email_notifications_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_notifications` ADD CONSTRAINT `email_notifications_personHistoryId_fkey` FOREIGN KEY (`personHistoryId`) REFERENCES `person_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
