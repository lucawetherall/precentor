-- Rename the EPISTLE reading position to NEW_TESTAMENT
ALTER TYPE "reading_position" RENAME VALUE 'EPISTLE' TO 'NEW_TESTAMENT';

-- Update placeholder references in service_sections
UPDATE "service_sections" SET placeholder_type = 'reading-nt' WHERE placeholder_type = 'reading-epistle';
