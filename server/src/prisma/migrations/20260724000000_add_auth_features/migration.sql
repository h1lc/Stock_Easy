-- AlterTable: password devient optionnel (comptes Google sans mot de passe)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: ajout des champs OAuth, refresh token et reset password
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpires" TIMESTAMP(3);

-- CreateIndex: contrainte d'unicité sur googleId
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
