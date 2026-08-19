-- CreateTable
CREATE TABLE "attendees" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "event_id" INTEGER NOT NULL,
    "tanda_id" INTEGER NOT NULL,
    "tanda_name" TEXT NOT NULL,
    "tanda_price" DOUBLE PRECISION NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "ticket_code" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_at" TIMESTAMP(3),

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_events" (
    "id" SERIAL NOT NULL,
    "attendee_id" UUID NOT NULL,
    "attendee_name" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "event_id" INTEGER NOT NULL,
    "tanda_id" INTEGER NOT NULL,
    "tanda_name" TEXT NOT NULL,
    "tanda_price" DOUBLE PRECISION NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "seller_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendees_ticket_code_key" ON "attendees"("ticket_code");
