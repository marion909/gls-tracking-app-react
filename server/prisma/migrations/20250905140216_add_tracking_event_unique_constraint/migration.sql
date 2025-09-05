/*
  Warnings:

  - A unique constraint covering the columns `[trackingId,date,time]` on the table `tracking_events` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "tracking_events_trackingId_date_time_key" ON "tracking_events"("trackingId", "date", "time");
