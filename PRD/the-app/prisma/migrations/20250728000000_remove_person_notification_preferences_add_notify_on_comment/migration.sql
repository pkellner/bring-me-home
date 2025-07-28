-- AlterTable: Add notifyOnComment to person_access
ALTER TABLE `person_access` ADD COLUMN `notifyOnComment` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add notifyOnComment to town_access
ALTER TABLE `town_access` ADD COLUMN `notifyOnComment` BOOLEAN NOT NULL DEFAULT false;

-- Migrate data from person_notification_preferences to person_access
UPDATE `person_access` pa
INNER JOIN `person_notification_preferences` pnp ON pa.userId = pnp.userId AND pa.personId = pnp.personId
SET pa.notifyOnComment = pnp.notifyOnNewComments
WHERE pnp.notifyOnNewComments = true;

-- DropTable
DROP TABLE IF EXISTS `person_notification_preferences`;