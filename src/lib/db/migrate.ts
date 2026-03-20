import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { ssl: "require", max: 1 });
const db = drizzle(client);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("Migrations applied successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
