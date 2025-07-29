-- Add opt-out tracking fields to users table
ALTER TABLE `users` ADD COLUMN `optOutNotes` VARCHAR(500) NULL;
ALTER TABLE `users` ADD COLUMN `optOutDate` DATETIME(3) NULL;

-- Add bounce and complaint fields to email_notifications table
ALTER TABLE `email_notifications` ADD COLUMN `bounceType` VARCHAR(191) NULL;
ALTER TABLE `email_notifications` ADD COLUMN `bounceSubType` VARCHAR(191) NULL;
ALTER TABLE `email_notifications` ADD COLUMN `diagnosticCode` TEXT NULL;
ALTER TABLE `email_notifications` ADD COLUMN `complaintFeedbackType` VARCHAR(191) NULL;
ALTER TABLE `email_notifications` ADD COLUMN `suppressionChecked` BOOLEAN NOT NULL DEFAULT false;

-- Create email_suppressions table
CREATE TABLE `email_suppressions` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reasonDetails` TEXT NULL,
    `source` VARCHAR(191) NOT NULL,
    `bounceType` VARCHAR(191) NULL,
    `bounceSubType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `email_suppressions_email_key`(`email`),
    INDEX `email_suppressions_email_idx`(`email`),
    INDEX `email_suppressions_reason_idx`(`reason`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;