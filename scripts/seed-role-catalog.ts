import "dotenv/config";
import { db } from "../src/lib/db";
import { roleCatalog } from "../src/lib/db/schema";
import { ROLE_CATALOG_SEED } from "../src/lib/db/seed-role-catalog";

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const row of ROLE_CATALOG_SEED) {
    const result = await db
      .insert(roleCatalog)
      .values(row)
      .onConflictDoNothing({ target: roleCatalog.key })
      .returning({ id: roleCatalog.id });
    if (result.length > 0) inserted++;
    else skipped++;
  }
  console.log(`role_catalog seed: inserted=${inserted} skipped=${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
