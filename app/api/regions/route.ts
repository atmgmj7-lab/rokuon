import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** 地域検索は公開データのため認証不要（拡張機能・クロスオリジンから利用） */

const SELECT_COLS =
  "SELECT id, prefecture, city, yomigana, population, search_volume FROM regions";

type RegionRow = {
  id: string;
  prefecture: string;
  city: string;
  yomigana: string;
  population: number | null;
  search_volume: number | null;
};

function toRegion(row: Record<string, unknown>): RegionRow {
  return {
    id: row.id as string,
    prefecture: row.prefecture as string,
    city: row.city as string,
    yomigana: (row.yomigana as string | null) ?? "",
    population: row.population as number | null,
    search_volume: row.search_volume as number | null,
  };
}

/**
 * 多段マッチ検索:
 *  1. 完全一致 (city = q, city = stripped)
 *  2. 前方一致 (city LIKE stripped%)
 *  3. 部分一致 (city/yomigana LIKE %q%)
 * 結果は重複除去して優先度順に返す
 */
async function searchRegions(rawQ: string): Promise<RegionRow[]> {
  // 都道府県プレフィックスを除去
  const withoutPref = rawQ
    .replace(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/, "")
    .trim();
  // 末尾の 市/区/町/村 を除去したベース名
  const stripped = (withoutPref || rawQ).replace(/[市区町村郡]$/, "").trim();
  const q = withoutPref || rawQ;

  const [exactRes, prefixRes, partialRes] = await Promise.all([
    // 完全一致 & stripped 一致
    db.execute({
      sql: `${SELECT_COLS} WHERE city = ? OR city = ? LIMIT 10`,
      args: [q, `${stripped}市`],
    }),
    // 前方一致
    db.execute({
      sql: `${SELECT_COLS} WHERE city LIKE ? OR city LIKE ? LIMIT 20`,
      args: [`${q}%`, `${stripped}%`],
    }),
    // 部分一致（city / yomigana）
    db.execute({
      sql: `${SELECT_COLS} WHERE city LIKE ? OR yomigana LIKE ? LIMIT 30`,
      args: [`%${q}%`, `%${q}%`],
    }),
  ]);

  // 優先度順にマージして重複除去
  const seen = new Set<string>();
  const merged: RegionRow[] = [];
  for (const row of [
    ...exactRes.rows,
    ...prefixRes.rows,
    ...partialRes.rows,
  ]) {
    const id = row.id as string;
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(toRegion(row as Record<string, unknown>));
    }
  }
  return merged.slice(0, 20);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    let regions: RegionRow[];
    if (q) {
      regions = await searchRegions(q);
    } else {
      const result = await db.execute(
        `${SELECT_COLS} ORDER BY prefecture, city`
      );
      regions = result.rows.map((r) => toRegion(r as Record<string, unknown>));
    }

    return NextResponse.json(
      { success: true, data: regions },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("regions GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "取得に失敗しました",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
