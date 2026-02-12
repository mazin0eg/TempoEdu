import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    this.bucket = process.env.MINIO_BUCKET || 'tempoedu';
  }

  async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, '');
    }
  }

  async uploadBuffer(prefix: string, file: any) {
    await this.ensureBucket();
    const ext = extname(file.originalname) || '';
    const key = `${prefix}/${randomUUID()}${ext}`;
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
    const publicUrl = this.getPublicUrl(key);
    return { key, url: publicUrl };
  }

  getPublicUrl(key: string) {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const host = process.env.MINIO_PUBLIC_HOST || process.env.MINIO_ENDPOINT || 'localhost';
    const port = Number(process.env.MINIO_PUBLIC_PORT || process.env.MINIO_PORT || 9000);
    return `${protocol}://${host}:${port}/${this.bucket}/${key}`;
  }
}
