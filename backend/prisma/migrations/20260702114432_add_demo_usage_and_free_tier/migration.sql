-- AlterTable
ALTER TABLE `user` ADD COLUMN `freeGenerationUsed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tier` VARCHAR(191) NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE `DemoUsage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ipHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DemoUsage_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
