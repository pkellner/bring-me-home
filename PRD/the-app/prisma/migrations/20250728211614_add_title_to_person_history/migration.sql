-- AlterTable
-- Add the title column with a temporary default
ALTER TABLE `person_history` ADD COLUMN `title` VARCHAR(255) NOT NULL DEFAULT 'Update';

-- Update existing records to use first part of description as title
UPDATE `person_history` 
SET `title` = CASE 
  WHEN LENGTH(`description`) > 100 THEN CONCAT(SUBSTRING(`description`, 1, 97), '...')
  ELSE `description`
END;

-- Remove the default constraint  
ALTER TABLE `person_history` ALTER COLUMN `title` DROP DEFAULT;
