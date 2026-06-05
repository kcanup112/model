/*
  Warnings:

  - You are about to drop the `exam_question_distributions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `topic_id` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exam_question_distributions" DROP CONSTRAINT "exam_question_distributions_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_question_distributions" DROP CONSTRAINT "exam_question_distributions_subject_id_fkey";

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "topic_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "exam_question_distributions";

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_topic_distributions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "one_mark_count" INTEGER NOT NULL,
    "two_mark_count" INTEGER NOT NULL,

    CONSTRAINT "exam_topic_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_subject_id_name_key" ON "topics"("subject_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exam_topic_distributions_exam_id_topic_id_key" ON "exam_topic_distributions"("exam_id", "topic_id");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_topic_distributions" ADD CONSTRAINT "exam_topic_distributions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_topic_distributions" ADD CONSTRAINT "exam_topic_distributions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
