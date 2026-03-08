import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  const additions = [
    "font_size  REAL DEFAULT 12",
    "font_color TEXT DEFAULT '#374151'",
    "node_shape TEXT DEFAULT 'rounded'",
  ];

  for (const col of additions) {
    const name = col.split(/\s+/)[0];
    try {
      await db.execute(`ALTER TABLE map_nodes ADD COLUMN ${col}`);
      console.log(`✓ Added column: ${name}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("duplicate")) {
        console.log(`  Already exists: ${name}`);
      } else {
        throw e;
      }
    }
  }

  console.log("Migration v27 complete.");
}

migrate().catch(console.error);
