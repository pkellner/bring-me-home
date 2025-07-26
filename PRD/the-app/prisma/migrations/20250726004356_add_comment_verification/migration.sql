-- AlterTable
ALTER TABLE `comments` ADD COLUMN `hideRequested` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hideRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `verificationEmailSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `comment_verification_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `lastAction` VARCHAR(191) NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `comment_verification_tokens_email_key`(`email`),
    UNIQUE INDEX `comment_verification_tokens_tokenHash_key`(`tokenHash`),
    INDEX `comment_verification_tokens_email_idx`(`email`),
    INDEX `comment_verification_tokens_tokenHash_idx`(`tokenHash`),
    INDEX `comment_verification_tokens_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `comments_hideRequested_idx` ON `comments`(`hideRequested`);
