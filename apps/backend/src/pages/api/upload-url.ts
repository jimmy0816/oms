import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const inputSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  module: z.enum(['reports', 'tickets', 'general', 'ticket-reviews']), // Define allowed modules
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fileName, fileType, module } = inputSchema.parse(req.body);

  // Generate a unique file key based on the module
  const fileExtension = fileName.split('.').pop();
  const fileKey = `${module}/${randomUUID()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 }); // URL expires in 60 seconds

    res.status(200).json({
      signedUrl,
      fileUrl: `${process.env.R2_PUBLIC_URL_PREFIX}/${fileKey}`, // Use public URL
      fileId: fileKey,
    });
  } catch (error) {
    console.error('Error creating signed URL', error);
    res.status(500).json({ message: 'Error creating signed URL' });
  }
}

export default handler;
