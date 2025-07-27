-- DropForeignKey
ALTER TABLE `persons` DROP FOREIGN KEY `persons_layoutId_fkey`;

-- DropForeignKey
ALTER TABLE `towns` DROP FOREIGN KEY `towns_defaultLayoutId_fkey`;

-- DropIndex
DROP INDEX `persons_layoutId_fkey` ON `persons`;

-- DropIndex
DROP INDEX `towns_defaultLayoutId_fkey` ON `towns`;

-- AlterTable
ALTER TABLE `persons` DROP COLUMN `layoutId`;

-- AlterTable
ALTER TABLE `towns` DROP COLUMN `defaultLayoutId`;

-- DropTable
DROP TABLE `layouts`;