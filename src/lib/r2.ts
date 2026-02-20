import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/** R2_PUBLIC_URL が S3 API エンドポイント（cloudflarestorage.com）かどうか。その場合は署名付きURLが必要 */
export function isR2PublicUrlS3Endpoint(): boolean {
  return !!(R2_PUBLIC_URL && R2_PUBLIC_URL.includes("cloudflarestorage.com"));
}

/**
 * R2 オブジェクトの署名付きURLを生成（有効期限: 1時間）
 * プライベートバケットや S3 API エンドポイント使用時に必要
 */
export async function getSignedAudioUrl(r2Key: string): Promise<string> {
  ensureR2Config();
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * R2接続に必要な環境変数が設定されているか確認
 */
function ensureR2Config(): void {
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME ||
    !R2_PUBLIC_URL
  ) {
    throw new Error(
      "Cloudflare R2 の環境変数が設定されていません。R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL を確認してください。"
    );
  }
}

/**
 * S3互換のR2クライアントを取得
 */
function getR2Client(): S3Client {
  ensureR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * バッファをCloudflare R2にアップロードし、公開URLを返す
 * @param buffer - アップロードするファイルのバッファ
 * @param fileName - オブジェクトキー（例: uploads/1739123456789.mp3）
 * @param contentType - MIMEタイプ（例: audio/mpeg）
 * @returns 公開URL（R2_PUBLIC_URL + key）
 */
export async function uploadToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  ensureR2Config();
  const client = getR2Client();

  // キーは uploads/ プレフィックス付きで整理
  const key = fileName.startsWith("uploads/") ? fileName : `uploads/${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // R2_PUBLIC_URL は末尾スラッシュなしを想定（例: https://xxx.r2.dev）
  const baseUrl = R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${baseUrl}/${key}`;
}

/**
 * R2 からオブジェクトを物理削除
 * @param r2Key - オブジェクトキー（例: uploads/1739123456789.mp3）
 */
export async function deleteFromR2(r2Key: string): Promise<void> {
  if (!r2Key?.trim()) return;
  ensureR2Config();
  const client = getR2Client();
  const key = r2Key.startsWith("uploads/") ? r2Key : `uploads/${r2Key}`;
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}
