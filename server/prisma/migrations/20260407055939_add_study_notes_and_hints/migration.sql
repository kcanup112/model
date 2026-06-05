-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "hint" TEXT;

-- CreateTable
CREATE TABLE "study_notes" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_note_figures" (
    "id" TEXT NOT NULL,
    "study_note_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "caption" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "study_note_figures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_notes_subject_id_topic_id_key" ON "study_notes"("subject_id", "topic_id");

-- AddForeignKey
ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_note_figures" ADD CONSTRAINT "study_note_figures_study_note_id_fkey" FOREIGN KEY ("study_note_id") REFERENCES "study_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
