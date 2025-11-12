/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "UserRole" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH "PrimaryRoleMapping" AS (
  SELECT
    u.id AS "userId",
    r.id AS "roleId"
  FROM "User" u
  JOIN "Role" r ON r.name = u.role
  WHERE u.role IS NOT NULL AND r.id IS NOT NULL
)
INSERT INTO "UserRole" ("userId", "roleId", "assignedAt")
SELECT
  pm."userId",
  pm."roleId",
  NOW()
FROM "PrimaryRoleMapping" pm
ON CONFLICT ("userId", "roleId") DO NOTHING;


WITH "PrimaryRoleMapping" AS (
  SELECT
    u.id AS "userId",
    r.id AS "roleId"
  FROM "User" u
  JOIN "Role" r ON r.name = u.role
  WHERE u.role IS NOT NULL AND r.id IS NOT NULL
)
UPDATE "UserRole"
SET "isPrimary" = true
WHERE ("userId", "roleId") IN (SELECT "userId", "roleId" FROM "PrimaryRoleMapping");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";
