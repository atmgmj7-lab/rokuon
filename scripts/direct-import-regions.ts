/**
 * regions_import.csv → Turso 直接バルクインサートスクリプト
 *
 * 実行コマンド:
 *   npx tsx scripts/direct-import-regions.ts
 *
 * 処理:
 *   - regions_import.csv を読み込み、500 件ずつチャンク処理
 *   - ON CONFLICT (prefecture, city) DO UPDATE で upsert
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// .env.local → .env の順で読み込む
const ROOT = path.dirname(path.dirname(path.resolve(__filename ?? import.meta.url.replace("file://", ""))));
dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

const CHUNK_SIZE = 500;
const CSV_FILE   = path.join(ROOT, "regions_import.csv");

// -----------------------------------------------
// CSV パーサー（ダブルクォート対応）
// -----------------------------------------------
function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < headers.length) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => (rec[h] = cols[idx] ?? ""));
    records.push(rec);
  }
  return records;
}

// -----------------------------------------------
// メイン
// -----------------------------------------------
async function main() {
  const dbUrl     = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error("❌ TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を .env に設定してください");
    process.exit(1);
  }

  console.log(`🔌 Turso に接続中... (${dbUrl})`);
  const client = createClient({ url: dbUrl, authToken });

  // CSV 読み込み
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ ${CSV_FILE} が見つかりません`);
    process.exit(1);
  }

  const raw     = fs.readFileSync(CSV_FILE, "utf-8");
  const records = parseCsv(raw);
  console.log(`📄 CSV 読み込み完了: ${records.length} 件`);

  // チャンク分割
  const chunks: Record<string, string>[][] = [];
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    chunks.push(records.slice(i, i + CHUNK_SIZE));
  }
  console.log(`🔢 チャンク数: ${chunks.length} (${CHUNK_SIZE} 件/チャンク)\n`);

  let totalInserted = 0;
  let totalUpdated  = 0;
  let totalErrors   = 0;

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const now   = Date.now();

    // バッチ実行: 各行を個別 upsert
    const statements = chunk.map((row) => {
      const id         = `region_${row.prefecture}_${row.city}`.replace(/\s/g, "_");
      const population = row.population ? parseInt(row.population, 10) : null;
      const searchVol  = row.search_volume ? parseInt(row.search_volume, 10) : 0;
      const yomigana   = row.yomigana || null;

      return {
        sql: `
          INSERT INTO regions (id, prefecture, city, yomigana, population, search_volume, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (prefecture, city) DO UPDATE SET
            yomigana       = excluded.yomigana,
            population     = excluded.population,
            search_volume  = excluded.search_volume,
            updated_at     = excluded.updated_at
        `,
        args: [id, row.prefecture, row.city, yomigana, population, searchVol, now, now],
      };
    });

    try {
      await client.batch(statements, "write");
      totalInserted += chunk.length;
      console.log(`  ✅ チャンク ${ci + 1}/${chunks.length}  ${chunk.length} 件 完了 (累計 ${totalInserted} 件)`);
    } catch (err) {
      console.error(`  ❌ チャンク ${ci + 1} エラー:`, err);
      totalErrors += chunk.length;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ インポート完了
   処理成功: ${totalInserted} 件
   エラー  : ${totalErrors} 件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  client.close();
}

main();
