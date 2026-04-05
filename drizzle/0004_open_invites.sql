-- Make invite email nullable to support open (shareable) invite links
ALTER TABLE "invites" ALTER COLUMN "email" DROP NOT NULL;
