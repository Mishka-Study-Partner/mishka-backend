-- Add explicit "missed" state (overdue and not completed); clients may set via PATCH or your app rules.
ALTER TYPE "TaskStatus" ADD VALUE 'missed';
