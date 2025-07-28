-- AlterTable
ALTER TABLE `email_opt_out_tokens` ADD COLUMN `useCount` INTEGER NOT NULL DEFAULT 0;

-- Update existing tokens to have useCount = 1 if they were used
UPDATE `email_opt_out_tokens` SET `useCount` = 1 WHERE `used` = true;