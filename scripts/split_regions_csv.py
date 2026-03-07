"""
regions_import.csv を 1000 行ずつ分割するスクリプト

使い方:
    python3 scripts/split_regions_csv.py

出力:
    regions_import_1.csv, regions_import_2.csv, ... (各ファイルはヘッダー行込み)
"""

import csv
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

INPUT  = "regions_import.csv"
CHUNK  = 1000

with open(INPUT, encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

total      = len(rows)
num_files  = math.ceil(total / CHUNK)

print(f"入力: {INPUT}  ({total} 件)")
print(f"分割数: {num_files} ファイル ({CHUNK} 行/ファイル)\n")

for i in range(num_files):
    chunk   = rows[i * CHUNK : (i + 1) * CHUNK]
    outfile = f"regions_import_{i + 1}.csv"
    with open(outfile, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(chunk)
    print(f"  ✅ {outfile}  ({len(chunk)} 件)")

print(f"\n完了: {num_files} ファイルを生成しました。")
