-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `permissions` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_roleId_fkey`(`roleId`),
    UNIQUE INDEX `user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `towns` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `county` VARCHAR(191) NULL,
    `zipCode` VARCHAR(191) NULL,
    `fullAddress` TEXT NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `defaultLayoutId` VARCHAR(191) NULL,
    `defaultThemeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `towns_slug_key`(`slug`),
    INDEX `towns_defaultLayoutId_fkey`(`defaultLayoutId`),
    INDEX `towns_defaultThemeId_fkey`(`defaultThemeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `persons` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `alienIdNumber` VARCHAR(191) NULL,
    `ssn` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `placeOfBirth` VARCHAR(191) NULL,
    `height` VARCHAR(191) NULL,
    `weight` VARCHAR(191) NULL,
    `eyeColor` VARCHAR(191) NULL,
    `hairColor` VARCHAR(191) NULL,
    `lastKnownAddress` TEXT NOT NULL,
    `currentAddress` TEXT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `emailAddress` VARCHAR(191) NULL,
    `story` TEXT NULL,
    `lastSeenDate` DATETIME(3) NULL,
    `lastSeenLocation` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isFound` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'missing',
    `layoutId` VARCHAR(191) NULL,
    `themeId` VARCHAR(191) NULL,
    `townId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `bondAmount` DECIMAL(10, 2) NULL,
    `bondStatus` VARCHAR(191) NULL,
    `caseNumber` VARCHAR(191) NULL,
    `countryOfOrigin` VARCHAR(191) NULL,
    `courtLocation` VARCHAR(191) NULL,
    `detentionCenterId` VARCHAR(191) NULL,
    `detentionDate` DATETIME(3) NULL,
    `detentionStatus` VARCHAR(191) NULL DEFAULT 'detained',
    `internationalAddress` TEXT NULL,
    `legalRepEmail` VARCHAR(191) NULL,
    `legalRepFirm` VARCHAR(191) NULL,
    `legalRepName` VARCHAR(191) NULL,
    `legalRepPhone` VARCHAR(191) NULL,
    `nextCourtDate` DATETIME(3) NULL,
    `releaseDate` DATETIME(3) NULL,
    `detentionStory` TEXT NULL,
    `familyMessage` TEXT NULL,
    `lastHeardFromDate` DATETIME(3) NULL,
    `notesFromLastContact` TEXT NULL,
    `representedByLawyer` BOOLEAN NOT NULL DEFAULT false,
    `representedByNotes` TEXT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `showDetentionInfo` BOOLEAN NOT NULL DEFAULT true,
    `showLastHeardFrom` BOOLEAN NOT NULL DEFAULT true,
    `showDetentionDate` BOOLEAN NOT NULL DEFAULT true,
    `showCommunitySupport` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `persons_slug_key`(`slug`),
    INDEX `persons_townId_idx`(`townId`),
    INDEX `persons_firstName_lastName_idx`(`firstName`, `lastName`),
    INDEX `persons_slug_idx`(`slug`),
    INDEX `persons_status_idx`(`status`),
    INDEX `persons_detentionCenterId_idx`(`detentionCenterId`),
    INDEX `persons_layoutId_fkey`(`layoutId`),
    INDEX `persons_themeId_fkey`(`themeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stories` (
    `id` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `storyType` VARCHAR(191) NOT NULL DEFAULT 'personal',
    `content` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `personId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stories_personId_idx`(`personId`),
    INDEX `stories_language_idx`(`language`),
    UNIQUE INDEX `stories_personId_language_storyType_key`(`personId`, `language`, `storyType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supporters` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `fullAddress` TEXT NULL,
    `country` VARCHAR(191) NULL,
    `relationship` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `supportMessage` TEXT NULL,
    `shareEmail` BOOLEAN NOT NULL DEFAULT false,
    `sharePhone` BOOLEAN NOT NULL DEFAULT false,
    `shareAddress` BOOLEAN NOT NULL DEFAULT false,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationToken` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `personId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supporters_verificationToken_key`(`verificationToken`),
    INDEX `supporters_personId_idx`(`personId`),
    INDEX `supporters_email_idx`(`email`),
    INDEX `supporters_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `moderatorNotes` TEXT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `familyVisibilityOverride` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'support',
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'public',
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `birthdate` DATETIME(3) NULL,
    `displayNameOnly` BOOLEAN NOT NULL DEFAULT false,
    `email` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `requiresFamilyApproval` BOOLEAN NOT NULL DEFAULT true,
    `showBirthdate` BOOLEAN NOT NULL DEFAULT false,
    `showOccupation` BOOLEAN NOT NULL DEFAULT false,
    `wantsToHelpMore` BOOLEAN NOT NULL DEFAULT false,
    `city` VARCHAR(191) NULL,
    `showCityState` BOOLEAN NOT NULL DEFAULT false,
    `state` VARCHAR(191) NULL,
    `streetAddress` VARCHAR(191) NULL,
    `zipCode` VARCHAR(191) NULL,

    INDEX `comments_personId_idx`(`personId`),
    INDEX `comments_visibility_idx`(`visibility`),
    INDEX `comments_type_idx`(`type`),
    INDEX `comments_isApproved_idx`(`isApproved`),
    INDEX `comments_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `town_access` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `townId` VARCHAR(191) NOT NULL,
    `accessLevel` VARCHAR(191) NOT NULL DEFAULT 'read',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `town_access_townId_fkey`(`townId`),
    UNIQUE INDEX `town_access_userId_townId_key`(`userId`, `townId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_access` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `accessLevel` VARCHAR(191) NOT NULL DEFAULT 'read',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `person_access_personId_fkey`(`personId`),
    UNIQUE INDEX `person_access_userId_personId_key`(`userId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `layouts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `cssClasses` TEXT NULL,
    `template` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `layouts_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `themes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `colors` TEXT NOT NULL,
    `cssVars` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `themes_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `dataType` VARCHAR(191) NOT NULL DEFAULT 'string',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `oldValues` TEXT NULL,
    `newValues` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_userId_idx`(`userId`),
    INDEX `audit_log_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_log_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detention_centers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `facilityType` VARCHAR(191) NOT NULL,
    `operatedBy` VARCHAR(191) NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'USA',
    `phoneNumber` VARCHAR(191) NULL,
    `faxNumber` VARCHAR(191) NULL,
    `emailAddress` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `capacity` INTEGER NULL,
    `currentPopulation` INTEGER NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isICEFacility` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `transportInfo` TEXT NULL,
    `visitingHours` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `imageId` VARCHAR(191) NULL,

    INDEX `detention_centers_state_idx`(`state`),
    INDEX `detention_centers_city_idx`(`city`),
    INDEX `detention_centers_name_idx`(`name`),
    INDEX `detention_centers_imageId_idx`(`imageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_checks` (
    `id` VARCHAR(191) NOT NULL,
    `testData` VARCHAR(191) NOT NULL,
    `testNumber` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_privacy_settings` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `showDetaineeEmail` BOOLEAN NOT NULL DEFAULT false,
    `showDetaineePhone` BOOLEAN NOT NULL DEFAULT false,
    `showDetaineeAddress` BOOLEAN NOT NULL DEFAULT false,
    `showAlienId` BOOLEAN NOT NULL DEFAULT false,
    `showLegalInfo` BOOLEAN NOT NULL DEFAULT false,
    `showSupporterEmails` BOOLEAN NOT NULL DEFAULT false,
    `showSupporterPhones` BOOLEAN NOT NULL DEFAULT false,
    `showSupporterAddresses` BOOLEAN NOT NULL DEFAULT false,
    `defaultCommentVisibility` VARCHAR(191) NOT NULL DEFAULT 'public',
    `notifyFamilyEmail` VARCHAR(191) NULL,
    `notifyOnNewSupporter` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnNewComment` BOOLEAN NOT NULL DEFAULT true,
    `authorizedEmails` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `family_privacy_settings_personId_key`(`personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image_storage` (
    `id` VARCHAR(191) NOT NULL,
    `data` LONGBLOB NULL,
    `mimeType` VARCHAR(191) NOT NULL DEFAULT 'image/jpeg',
    `size` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `caption` VARCHAR(191) NULL,
    `uploadedById` VARCHAR(191) NULL,
    `storageType` VARCHAR(191) NOT NULL DEFAULT 'database',
    `s3Bucket` VARCHAR(191) NULL,
    `s3Key` VARCHAR(191) NULL,
    `s3Region` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `image_storage_uploadedById_idx`(`uploadedById`),
    INDEX `image_storage_storageType_idx`(`storageType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_images` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `imageType` VARCHAR(191) NOT NULL DEFAULT 'gallery',
    `sequenceNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `person_images_personId_idx`(`personId`),
    INDEX `person_images_imageId_idx`(`imageId`),
    INDEX `person_images_sequenceNumber_idx`(`sequenceNumber`),
    UNIQUE INDEX `person_images_personId_imageId_key`(`personId`, `imageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detention_center_images` (
    `id` VARCHAR(191) NOT NULL,
    `detentionCenterId` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `detention_center_images_detentionCenterId_key`(`detentionCenterId`),
    INDEX `detention_center_images_imageId_idx`(`imageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `towns` ADD CONSTRAINT `towns_defaultLayoutId_fkey` FOREIGN KEY (`defaultLayoutId`) REFERENCES `layouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `towns` ADD CONSTRAINT `towns_defaultThemeId_fkey` FOREIGN KEY (`defaultThemeId`) REFERENCES `themes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons` ADD CONSTRAINT `persons_detentionCenterId_fkey` FOREIGN KEY (`detentionCenterId`) REFERENCES `detention_centers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons` ADD CONSTRAINT `persons_layoutId_fkey` FOREIGN KEY (`layoutId`) REFERENCES `layouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons` ADD CONSTRAINT `persons_themeId_fkey` FOREIGN KEY (`themeId`) REFERENCES `themes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `persons` ADD CONSTRAINT `persons_townId_fkey` FOREIGN KEY (`townId`) REFERENCES `towns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supporters` ADD CONSTRAINT `supporters_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supporters` ADD CONSTRAINT `supporters_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `town_access` ADD CONSTRAINT `town_access_townId_fkey` FOREIGN KEY (`townId`) REFERENCES `towns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `town_access` ADD CONSTRAINT `town_access_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_access` ADD CONSTRAINT `person_access_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_access` ADD CONSTRAINT `person_access_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_privacy_settings` ADD CONSTRAINT `family_privacy_settings_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `image_storage` ADD CONSTRAINT `image_storage_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_images` ADD CONSTRAINT `person_images_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_images` ADD CONSTRAINT `person_images_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `image_storage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detention_center_images` ADD CONSTRAINT `detention_center_images_detentionCenterId_fkey` FOREIGN KEY (`detentionCenterId`) REFERENCES `detention_centers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detention_center_images` ADD CONSTRAINT `detention_center_images_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `image_storage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
