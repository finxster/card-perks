import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';

export interface CloudflareR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

export class CloudflareR2Service {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: CloudflareR2Config) {
    // Initialize S3 client for Cloudflare R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    
    this.bucketName = config.bucketName;
    this.publicUrl = config.publicUrl || `https://pub-${config.accountId}.r2.dev`;
  }

  /**
   * Upload image to Cloudflare R2 and return the URL
   */
  async uploadImage(imageBuffer: Buffer, mimeType: string, userId: string): Promise<{ url: string; key: string }> {
    // Generate unique filename
    const extension = this.getExtensionFromMimeType(mimeType);
    const randomId = randomBytes(16).toString('hex');
    const key = `ocr-images/${userId}/${Date.now()}-${randomId}${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
        // Set expiration metadata (R2 doesn't support automatic expiration, so we'll handle cleanup manually)
        Metadata: {
          'uploaded-by': userId,
          'uploaded-at': new Date().toISOString(),
          'expires-at': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }
      });

      await this.s3Client.send(command);
      
      const url = `${this.publicUrl}/${key}`;
      return { url, key };
    } catch (error) {
      console.error('Error uploading to R2:', error);
      throw new Error('Failed to upload image to storage');
    }
  }

  /**
   * Delete image from Cloudflare R2
   */
  async deleteImage(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting from R2:', error);
      return false;
    }
  }

  /**
   * Delete multiple images from Cloudflare R2
   */
  async deleteImages(keys: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    // Process deletions in parallel, but limit concurrency
    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const promises = batch.map(async (key) => {
        const deleted = await this.deleteImage(key);
        if (deleted) {
          success.push(key);
        } else {
          failed.push(key);
        }
      });
      
      await Promise.all(promises);
    }

    return { success, failed };
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
    };

    return extensions[mimeType.toLowerCase()] || '.jpg';
  }
}

// Initialize R2 service with environment variables
export const createR2Service = (): CloudflareR2Service => {
  const config: CloudflareR2Config = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'cardperks-ocr-images',
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
  };

  // Validate required environment variables
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Missing required Cloudflare R2 configuration. Please check environment variables.');
  }

  return new CloudflareR2Service(config);
};