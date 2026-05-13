-- AlterTable: make list_id nullable so tasks can exist without a todo list
ALTER TABLE "tasks" ALTER COLUMN "list_id" DROP NOT NULL;
