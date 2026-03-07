"""
e-Stat人口データ + 全国住所データ → regions_import.csv 生成スクリプト

使い方:
    python3 scripts/generate_regions_csv.py

入力:
    zenkoku.csv    - 全国住所データ (Shift-JIS、読み仮名用)
    b01_01.xlsx    - 令和2年国勢調査 人口データ

出力:
    regions_import.csv  - prefecture,city,yomigana,population,search_volume
"""

import csv
import re
import sys
import os
import openpyxl

# ---- 実行ディレクトリをプロジェクトルートに ----
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# -----------------------------------------------
# ユーティリティ
# -----------------------------------------------

def kata_to_hira(text: str) -> str:
    """カタカナ → ひらがな変換"""
    result = []
    for ch in text:
        code = ord(ch)
        if 0x30A1 <= code <= 0x30F6:   # ァ〜ヶ
            result.append(chr(code - 0x60))
        else:
            result.append(ch)
    return "".join(result)


def strip_code_prefix(text: str) -> str:
    """先頭の数字とアンダーバーを除去: '01_北海道' → '北海道', '0004_札幌市中央区' → '札幌市中央区'"""
    return re.sub(r"^\d+_", "", str(text)).strip()


# -----------------------------------------------
# ステップ1: zenkoku.csv から読み仮名辞書を作成
# -----------------------------------------------
print("【ステップ1】 zenkoku.csv を読み込み中...")

yomi_dict: dict[tuple[str, str], str] = {}

with open("zenkoku.csv", encoding="shift_jis", newline="", errors="replace") as f:
    reader = csv.reader(f)
    header = next(reader)   # ヘッダー行をスキップ

    for row in reader:
        try:
            废止 = row[6].strip()    # 廃止フラグ
            if 废止 == "1":          # 廃止済み住所はスキップ
                continue

            pref = row[7].strip()   # 都道府県
            city = row[9].strip()   # 市区町村
            kana = row[10].strip()  # 市区町村カナ

            if pref and city and kana:
                key = (pref, city)
                if key not in yomi_dict:
                    yomi_dict[key] = kata_to_hira(kana)
        except IndexError:
            continue

print(f"  → 読み仮名辞書: {len(yomi_dict):,} 件")

# -----------------------------------------------
# ステップ2: b01_01.xlsx から人口データを取得
# -----------------------------------------------
print("【ステップ2】 b01_01.xlsx を読み込み中...")

wb = openpyxl.load_workbook("b01_01.xlsx", read_only=True)
ws = wb.active

SKIP_ROWS = 15   # 0〜14行目（メタデータ・多段ヘッダー）をスキップ
records: list[dict] = []
skipped_a = 0
skipped_err = 0

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < SKIP_ROWS:
        continue

    # col0: 地域識別コード
    code = str(row[0]).strip() if row[0] is not None else ""

    # 'a' = 全国 or 都道府県行 → 除外
    if code == "a":
        skipped_a += 1
        continue

    # col4: 2020年_都道府県  col6: 地域名  col7: 人口（総数）
    pref_raw = str(row[4]).strip() if row[4] is not None else ""
    city_raw = str(row[6]).strip() if row[6] is not None else ""
    pop_raw  = row[7]

    if not pref_raw or not city_raw:
        skipped_err += 1
        continue

    pref = strip_code_prefix(pref_raw)   # '01_北海道' → '北海道'
    city = strip_code_prefix(city_raw)   # '0004_札幌市中央区' → '札幌市中央区'

    # 都道府県名と同じ地域名の行（都道府県合計行）も除外
    if city == pref:
        skipped_a += 1
        continue

    # 人口を整数に
    try:
        population = int(str(pop_raw).replace(",", "").strip())
    except (ValueError, TypeError):
        population = 0

    # 読み仮名を辞書から取得（なければ空文字）
    yomigana = yomi_dict.get((pref, city), "")

    records.append({
        "prefecture": pref,
        "city": city,
        "yomigana": yomigana,
        "population": population,
        "search_volume": 0,
    })

wb.close()

print(f"  → 市区町村データ: {len(records):,} 件")
print(f"  → スキップ（全国/都道府県行）: {skipped_a} 件")
print(f"  → スキップ（データ不備）: {skipped_err} 件")

yomi_hit  = sum(1 for r in records if r["yomigana"])
yomi_miss = len(records) - yomi_hit
print(f"  → 読み仮名マッチ: {yomi_hit:,} 件 / 未マッチ: {yomi_miss:,} 件")

# -----------------------------------------------
# ステップ3: regions_import.csv を出力
# -----------------------------------------------
OUTPUT = "regions_import.csv"
print(f"\n【ステップ3】 {OUTPUT} を生成中...")

FIELDNAMES = ["prefecture", "city", "yomigana", "population", "search_volume"]

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
    writer.writeheader()
    writer.writerows(records)

print(f"✅ {OUTPUT} を生成しました（{len(records):,} 件）")

# -----------------------------------------------
# 先頭5行を確認出力
# -----------------------------------------------
print(f"\n--- {OUTPUT} の最初の5行 ---")
with open(OUTPUT, encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    for j, row in enumerate(reader):
        print(",".join(row))
        if j >= 5:
            break
