-- CreateTable
CREATE TABLE "yacht_news_events" (
    "id" SERIAL NOT NULL,
    "event_key" VARCHAR(200) NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" INTEGER,
    "achievement_id" VARCHAR(100),
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yacht_news_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "yacht_news_events_event_key_key" ON "yacht_news_events"("event_key");

-- CreateIndex
CREATE INDEX "yacht_news_events_event_type_occurred_at_idx" ON "yacht_news_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "yacht_news_events_user_id_occurred_at_idx" ON "yacht_news_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "yacht_news_events_match_id_idx" ON "yacht_news_events"("match_id");

-- CreateIndex
CREATE INDEX "yacht_news_events_achievement_id_idx" ON "yacht_news_events"("achievement_id");

-- AddForeignKey
ALTER TABLE "yacht_news_events" ADD CONSTRAINT "yacht_news_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "yacht_news_events" ADD CONSTRAINT "yacht_news_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
