-- AlterTable
ALTER TABLE `persons` ADD COLUMN `bailConditions` TEXT NULL,
    ADD COLUMN `bailPostedBy` VARCHAR(191) NULL,
    ADD COLUMN `bailPostedDate` DATETIME(3) NULL,
    ADD COLUMN `deportationDate` DATETIME(3) NULL,
    ADD COLUMN `deportationDestination` VARCHAR(191) NULL,
    ADD COLUMN `finalOutcome` VARCHAR(191) NULL,
    ADD COLUMN `finalOutcomeDate` DATETIME(3) NULL,
    ADD COLUMN `finalOutcomeNotes` TEXT NULL,
    ADD COLUMN `hearingDate` DATETIME(3) NULL,
    ADD COLUMN `hearingLocation` TEXT NULL,
    ADD COLUMN `hearingNotes` TEXT NULL,
    ADD COLUMN `statusDetails` JSON NULL,
    ADD COLUMN `statusUpdatedAt` DATETIME(3) NULL,
    ADD COLUMN `statusUpdatedBy` VARCHAR(191) NULL,
    ADD COLUMN `visaGrantedDate` DATETIME(3) NULL,
    ADD COLUMN `visaGrantedType` VARCHAR(191) NULL,
    MODIFY `detentionStatus` VARCHAR(191) NULL DEFAULT 'currently_detained';

-- CreateIndex
CREATE INDEX `persons_detentionStatus_idx` ON `persons`(`detentionStatus`);

-- CreateIndex
CREATE INDEX `persons_finalOutcome_idx` ON `persons`(`finalOutcome`);
