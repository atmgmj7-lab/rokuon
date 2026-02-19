/**
 * Vercel サーバーレス環境で、一時ファイルの書き込み先を /tmp に強制。
 * mkdir '/var/task/public' エラーを回避するため、os.tmpdir() が /tmp を返すようにする。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TMPDIR = "/tmp";
    process.env.TEMP = "/tmp";
    process.env.TMP = "/tmp";
  }
}
