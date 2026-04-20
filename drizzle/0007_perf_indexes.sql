-- Performance indexes for frequently-filtered hot paths.
-- Matches the index() declarations in src/lib/db/schema-base.ts.

-- Find members of a church filtered by role (e.g. "who are the admins of this church").
CREATE INDEX IF NOT EXISTS "membership_church_role_idx" ON "church_memberships" ("church_id", "role");

-- Filter a church's services by status (e.g. DRAFT vs PUBLISHED).
CREATE INDEX IF NOT EXISTS "service_church_status_idx" ON "services" ("church_id", "status");

-- List invites for a church.
CREATE INDEX IF NOT EXISTS "invite_church_idx" ON "invites" ("church_id");

-- Look up invites by email address.
CREATE INDEX IF NOT EXISTS "invite_email_idx" ON "invites" ("email");
