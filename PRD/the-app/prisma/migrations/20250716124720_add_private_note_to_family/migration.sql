-- AlterTable
ALTER TABLE `comments` ADD COLUMN `privateNoteToFamily` TEXT;

-- Change showCityState default
ALTER TABLE `comments` ALTER COLUMN `showCityState` SET DEFAULT true;