import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY!;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY!;
const R2_BUCKET = process.env.R2_BUCKET || 'melhormetro-media';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(fileUrl: string): Promise<void> {
  // Extract key from full URL: https://pub-xxx.r2.dev/uuid.mp4 → uuid.mp4
  // Only delete R2 files, skip external URLs
  if (!fileUrl || !R2_PUBLIC_URL || !fileUrl.startsWith(R2_PUBLIC_URL)) return;

  const key = fileUrl.replace(`${R2_PUBLIC_URL}/`, '');
  if (!key) return;

  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}
