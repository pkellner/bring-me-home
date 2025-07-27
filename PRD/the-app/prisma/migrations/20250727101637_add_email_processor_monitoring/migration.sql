-- CreateTable
CREATE TABLE `email_processor_logs` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `level` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `metadata` JSON NULL,
    `emailId` VARCHAR(191) NULL,
    `batchId` VARCHAR(191) NULL,
    `processId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_processor_logs_timestamp_idx`(`timestamp`),
    INDEX `email_processor_logs_level_idx`(`level`),
    INDEX `email_processor_logs_category_idx`(`category`),
    INDEX `email_processor_logs_emailId_idx`(`emailId`),
    INDEX `email_processor_logs_batchId_idx`(`batchId`),
    INDEX `email_processor_logs_processId_idx`(`processId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_processor_control` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'control',
    `isPaused` BOOLEAN NOT NULL DEFAULT false,
    `isAborted` BOOLEAN NOT NULL DEFAULT false,
    `pausedBy` VARCHAR(191) NULL,
    `pausedAt` DATETIME(3) NULL,
    `abortedBy` VARCHAR(191) NULL,
    `abortedAt` DATETIME(3) NULL,
    `lastCheckAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;