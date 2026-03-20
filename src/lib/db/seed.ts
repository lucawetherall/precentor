import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hymns, anthems, massSettings, responsesSettings, canticleSettings } from "./schema";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

function readJson(filename: string) {
  const path = join(__dirname, "..", "..", "data", filename);
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function seed() {
  const nehData = readJson("hymns-neh.json");
  const amData = readJson("hymns-am.json");
  const anthemsData = readJson("anthems-seed.json");
  const massData = readJson("mass-settings.json");
  const responsesData = readJson("responses.json");
  const canticlesData = readJson("canticles.json");

  console.log(`Seeding hymns (NEH): ${nehData.length} entries...`);
  for (const h of nehData) {
    await db.insert(hymns).values(h).onConflictDoNothing();
  }

  console.log(`Seeding hymns (AM): ${amData.length} entries...`);
  for (const h of amData) {
    await db.insert(hymns).values(h).onConflictDoNothing();
  }

  console.log(`Seeding anthems: ${anthemsData.length} entries...`);
  for (const a of anthemsData) {
    await db.insert(anthems).values(a).onConflictDoNothing();
  }

  console.log(`Seeding mass settings: ${massData.length} entries...`);
  for (const m of massData) {
    await db.insert(massSettings).values(m).onConflictDoNothing();
  }

  console.log(`Seeding responses: ${responsesData.length} entries...`);
  for (const r of responsesData) {
    await db.insert(responsesSettings).values(r).onConflictDoNothing();
  }

  console.log(`Seeding canticle settings: ${canticlesData.length} entries...`);
  for (const c of canticlesData) {
    await db.insert(canticleSettings).values(c).onConflictDoNothing();
  }

  console.log("Seed complete.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
