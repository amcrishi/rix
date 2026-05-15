-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "activity_level" TEXT,
ADD COLUMN     "body_measurements" JSONB,
ADD COLUMN     "date_of_birth" TEXT,
ADD COLUMN     "dietary_preference" TEXT,
ADD COLUMN     "medical_conditions" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "target_weight" DOUBLE PRECISION,
ADD COLUMN     "workout_preference" TEXT;
