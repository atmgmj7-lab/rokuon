/**
 * Vercel サーバーレス環境で、一時ファイルの書き込み先を /tmp に強制。
 * Vercel で一時ファイルを /tmp に書き込むよう TMPDIR を設定する。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TMPDIR = "/tmp";
    process.env.TEMP = "/tmp";
    process.env.TMP = "/tmp";
  }
}
