-- CreateTable
CREATE TABLE "level_configs" (
    "id" SERIAL NOT NULL,
    "level_number" INTEGER NOT NULL,
    "sub_level_count" INTEGER NOT NULL DEFAULT 6,
    "questions_per_sublevel" INTEGER NOT NULL DEFAULT 20,
    "easy_weight" INTEGER NOT NULL DEFAULT 100,
    "medium_weight" INTEGER NOT NULL DEFAULT 0,
    "hard_weight" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_level_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_number" INTEGER NOT NULL,
    "sub_level" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_passed" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL DEFAULT 20,
    "answers" JSONB,
    "questions" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "is_submitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_level_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB,
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_marks" INTEGER NOT NULL DEFAULT 140,
    "is_submitted" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "time_taken_seconds" INTEGER,
    "result_breakdown" JSONB,

    CONSTRAINT "mock_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "total_marks" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_exam_questions" (
    "id" TEXT NOT NULL,
    "special_exam_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" TEXT NOT NULL,
    "hint" TEXT,
    "subject" TEXT,
    "topic" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "weightage" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "special_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_exam_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "special_exam_id" TEXT NOT NULL,
    "answers" JSONB,
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_submitted" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "time_taken_seconds" INTEGER,

    CONSTRAINT "special_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_configs_level_number_key" ON "level_configs"("level_number");

-- CreateIndex
CREATE INDEX "user_level_progress_user_id_level_number_sub_level_idx" ON "user_level_progress"("user_id", "level_number", "sub_level");

-- AddForeignKey
ALTER TABLE "user_level_progress" ADD CONSTRAINT "user_level_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_exam_questions" ADD CONSTRAINT "special_exam_questions_special_exam_id_fkey" FOREIGN KEY ("special_exam_id") REFERENCES "special_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_exam_attempts" ADD CONSTRAINT "special_exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_exam_attempts" ADD CONSTRAINT "special_exam_attempts_special_exam_id_fkey" FOREIGN KEY ("special_exam_id") REFERENCES "special_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
