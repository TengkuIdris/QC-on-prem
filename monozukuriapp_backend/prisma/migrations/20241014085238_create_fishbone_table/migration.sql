-- CreateTable
CREATE TABLE "FishBone" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fontFamily" VARCHAR(255) DEFAULT 'JTC',
    "parameters" JSONB NOT NULL,
    "userId" INTEGER NOT NULL,
    "image" VARCHAR(255) NOT NULL,
    "size" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishBone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FishBone" ADD CONSTRAINT "FishBone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
