-- AlterTable
-- First rename the column to preserve existing data
ALTER TABLE `email_notifications` 
    CHANGE COLUMN `errorMessage` `lastMailServerMessage` TEXT NULL;

-- Then add the new date column
ALTER TABLE `email_notifications` 
    ADD COLUMN `lastMailServerMessageDate` DATETIME(3) NULL;

-- Update the date for any existing error messages to the updatedAt timestamp
UPDATE `email_notifications` 
SET `lastMailServerMessageDate` = `updatedAt` 
WHERE `lastMailServerMessage` IS NOT NULL;