/*
  Warnings:

  - You are about to drop the column `s3Bucket` on the `image_storage` table. All the data in the column will be lost.
  - You are about to drop the column `s3Region` on the `image_storage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `image_storage` DROP COLUMN `s3Bucket`,
    DROP COLUMN `s3Region`;
