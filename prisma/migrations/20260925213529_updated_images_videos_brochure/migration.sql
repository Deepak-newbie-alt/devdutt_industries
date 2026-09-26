/*
  Warnings:

  - You are about to drop the column `file_name` on the `productbrochures` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `productbrochures` table. All the data in the column will be lost.
  - You are about to drop the column `display_order` on the `productimages` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `productimages` table. All the data in the column will be lost.
  - You are about to drop the column `display_order` on the `productvideos` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_url` on the `productvideos` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `productbrochures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `productbrochures` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `productimages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `youtubeUrl` to the `productvideos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "productbrochures" DROP COLUMN "file_name",
DROP COLUMN "file_url",
ADD COLUMN     "fileName" VARCHAR(255) NOT NULL,
ADD COLUMN     "fileUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "productimages" DROP COLUMN "display_order",
DROP COLUMN "image_url",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "productvideos" DROP COLUMN "display_order",
DROP COLUMN "youtube_url",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "youtubeUrl" TEXT NOT NULL;
