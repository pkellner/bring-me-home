-- CreateTable
CREATE TABLE `person_notification_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `notifyOnNewComments` BOOLEAN NOT NULL DEFAULT false,
    `notifyFrequency` VARCHAR(191) NOT NULL DEFAULT 'immediate',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `person_notification_preferences_userId_idx`(`userId`),
    INDEX `person_notification_preferences_personId_idx`(`personId`),
    UNIQUE INDEX `person_notification_preferences_userId_personId_key`(`userId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_notification_preferences` ADD CONSTRAINT `person_notification_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_notification_preferences` ADD CONSTRAINT `person_notification_preferences_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (remove old columns from users table)
ALTER TABLE `users` DROP COLUMN `notifyOnNewComments`,
    DROP COLUMN `notifyFrequency`;