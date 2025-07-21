-- AlterTable
ALTER TABLE `anonymous_support` ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `geoCity` VARCHAR(191) NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `processedForLatLon` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `region` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `comments` ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `geoCity` VARCHAR(191) NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `processedForLatLon` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `region` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `anonymous_support_processedForLatLon_idx` ON `anonymous_support`(`processedForLatLon`);

-- CreateIndex
CREATE INDEX `comments_processedForLatLon_idx` ON `comments`(`processedForLatLon`);
