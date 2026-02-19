"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

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
