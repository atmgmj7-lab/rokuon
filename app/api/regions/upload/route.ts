/**
 * POST /api/regions/upload
 * CSV ファイルを受け取り regions テーブルに一括 upsert（管理者のみ）
 *
 * CSVフォーマット（ヘッダー行必須）:
 *   prefecture,city,yomigana,population,search_volume
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { getSessionFromRequest } from "@/src/lib/auth-request";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "この操作は管理者のみ行えます" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "ファイルが見つかりません" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSVにデータがありません（ヘッダー行を含む2行以上必要）" },
        { status: 400 }
      );
    }

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prefecture = row["prefecture"] ?? row["都道府県"] ?? "";
      const city = row["city"] ?? row["市区町村"] ?? "";
      const yomigana = row["yomigana"] ?? row["読み仮名"] ?? null;
      const populationRaw = row["population"] ?? row["人口"] ?? "";
      const searchVolumeRaw = row["search_volume"] ?? row["検索ボリューム"] ?? "";

      if (!prefecture || !city) {
        errors.push(`行 ${i + 2}: prefecture と city は必須です`);
        continue;
      }

      const population = populationRaw ? parseInt(populationRaw.replace(/,/g, ""), 10) : null;
      const searchVolume = searchVolumeRaw ? parseInt(searchVolumeRaw.replace(/,/g, ""), 10) : null;
      const now = Date.now();
      const id = `reg_${now}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        const existing = await db.execute({
          sql: "SELECT id FROM regions WHERE prefecture = ? AND city = ? LIMIT 1",
          args: [prefecture, city],
        });

        if (existing.rows.length > 0) {
          await db.execute({
            sql: "UPDATE regions SET yomigana = ?, population = ?, search_volume = ?, updated_at = ? WHERE prefecture = ? AND city = ?",
            args: [yomigana || null, population ?? null, searchVolume ?? null, now, prefecture, city],
          });
          updated++;
        } else {
          await db.execute({
            sql: "INSERT INTO regions (id, prefecture, city, yomigana, population, search_volume, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            args: [id, prefecture, city, yomigana || null, population ?? null, searchVolume ?? null, now, now],
          });
          inserted++;
        }
      } catch (rowError) {
        errors.push(`行 ${i + 2} (${prefecture} ${city}): ${rowError instanceof Error ? rowError.message : "エラー"}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { inserted, updated, errors, total: rows.length },
    });
  } catch (error) {
    console.error("regions upload error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
