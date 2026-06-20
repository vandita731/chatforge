-- CreateTable
CREATE TABLE "blog_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blogToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_connections_userId_key" ON "blog_connections"("userId");

-- AddForeignKey
ALTER TABLE "blog_connections" ADD CONSTRAINT "blog_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
