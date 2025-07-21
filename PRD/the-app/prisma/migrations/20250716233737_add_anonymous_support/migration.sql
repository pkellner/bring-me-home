-- CreateTable
CREATE TABLE `anonymous_support` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `anonymous_support_personId_idx`(`personId`),
    INDEX `anonymous_support_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `anonymous_support` ADD CONSTRAINT `anonymous_support_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
