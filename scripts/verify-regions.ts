import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function verify() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const total  = await client.execute("SELECT COUNT(*) as cnt FROM regions");
  const sample = await client.execute(
    "SELECT prefecture, city, yomigana, population FROM regions LIMIT 5"
  );
  console.log("総件数:", total.rows[0].cnt);
  console.log("サンプル:");
  sample.rows.forEach((r) =>
    console.log(" ", r.prefecture, r.city, r.yomigana ?? "(読み仮名なし)", r.population)
  );
  client.close();
}
verify();
