/*
  Warnings:

  - Added the required column `updatedAt` to the `email_opt_outs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `email_notifications` ADD COLUMN `customizations` JSON NULL,
    ADD COLUMN `templateId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `email_opt_outs` ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'manual',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `personId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `email_opt_out_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_opt_out_tokens_token_key`(`token`),
    INDEX `email_opt_out_tokens_userId_idx`(`userId`),
    INDEX `email_opt_out_tokens_token_idx`(`token`),
    INDEX `email_opt_out_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `htmlContent` TEXT NOT NULL,
    `textContent` TEXT NULL,
    `variables` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `email_templates_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `email_notifications_templateId_idx` ON `email_notifications`(`templateId`);

-- CreateIndex
CREATE INDEX `email_opt_outs_userId_idx` ON `email_opt_outs`(`userId`);

-- AddForeignKey
ALTER TABLE `email_notifications` ADD CONSTRAINT `email_notifications_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `email_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_opt_out_tokens` ADD CONSTRAINT `email_opt_out_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_opt_out_tokens` ADD CONSTRAINT `email_opt_out_tokens_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `email_opt_outs` RENAME INDEX `email_opt_outs_personId_fkey` TO `email_opt_outs_personId_idx`;
