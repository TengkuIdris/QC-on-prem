import { Injectable } from "@nestjs/common";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import * as path from "path";
import { toUtf8 } from "src/helpers/toUtf8.helper";

// On-prem: when AWS_S3_ENDPOINT is set we talk to a self-hosted S3-compatible
// store (MinIO in docker-compose). Path-style addressing is required because
// MinIO doesn't do virtual-host buckets out of the box, and the returned
// public URL has to use whatever hostname the browser can reach (host port
// 9000), not the in-network service name.
const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || undefined;
const S3_PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL || S3_ENDPOINT;

@Injectable()
export class AwsS3Service {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_CONFIG_REGION || "us-east-1",
      ...(S3_ENDPOINT
        ? { endpoint: S3_ENDPOINT, forcePathStyle: true }
        : {}),
      credentials: {
        accessKeyId: process.env.AWS_CONFIG_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_CONFIG_SECRET_ACCESS_KEY,
      },
    });
  }

  private buildPublicUrl(fileName: string): string {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (S3_PUBLIC_URL) {
      // Path-style: <base>/<bucket>/<key>
      return `${S3_PUBLIC_URL.replace(/\/$/, "")}/${bucket}/${fileName}`;
    }
    // AWS subdomain-style (legacy production behavior).
    return `https://${bucket}.s3.${process.env.AWS_CONFIG_REGION}.amazonaws.com/${fileName}`;
  }

  private extractKeyFromUrl(fileUrl: string): string {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (S3_PUBLIC_URL) {
      const prefix = `${S3_PUBLIC_URL.replace(/\/$/, "")}/${bucket}/`;
      return fileUrl.startsWith(prefix) ? fileUrl.slice(prefix.length) : fileUrl;
    }
    const region = process.env.AWS_CONFIG_REGION;
    return fileUrl.replace(`https://${bucket}.s3.${region}.amazonaws.com/`, "");
  }

  async uploadFile(file: Express.Multer.File) {
    const fileName = `${uuid()}-${toUtf8(file.originalname).substring(0, 10)}${path.extname(file.originalname)}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileName,
          ContentType: file.mimetype,
          Body: file.buffer,
        }),
      );
      return this.buildPublicUrl(fileName);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async deleteFile(fileUrl: string) {
    try {
      const fileKey = this.extractKeyFromUrl(fileUrl);

      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileKey,
        }),
      );
      return { success: true, message: "File deleted successfully" };
    } catch (error) {
      return { success: false, message: "Failed to delete file", error: error.message };
    }
  }
}
