-- AlterTable
ALTER TABLE `users` ADD COLUMN `notifyFrequency` VARCHAR(191) NOT NULL DEFAULT 'immediate',
    ADD COLUMN `notifyOnNewComments` BOOLEAN NOT NULL DEFAULT false;