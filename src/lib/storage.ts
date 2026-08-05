import "server-only";
import type { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

/**
 * Файл хадгалалт. Апп-ын бусад хэсэг S3 SDK эсхүл файлын системд шууд хандахгүй —
 * зөвхөн энэ модулиар дамжина.
 *
 * STORAGE_DRIVER=local  → ./data/uploads (хөгжүүлэлт, Docker-гүй орчин)
 * STORAGE_DRIVER=s3     → MinIO (сервер)
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Файлын эхний байтуудаар бодит төрлийг тогтооно. Өргөтгөл, хэрэглэгчийн
 * мэдээлсэн Content-Type хоёрт найдахгүй — .exe-г .pdf нэрлэсэн тохиолдлыг барина.
 */
export function sniffMimeType(bytes: Uint8Array): AllowedMimeType | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  return null;
}

/**
 * Хадгалалтын түлхүүр. Эх файлын нэрийг хэзээ ч хэрэглэхгүй — кирилл үсэг,
 * давхардал, path traversal-аас сэргийлнэ. Эх нэр DB-д тусад нь хадгалагдана.
 */
export function buildKey(
  applicationId: string,
  requirementCode: string,
  mimeType: AllowedMimeType,
): string {
  return `applications/${applicationId}/${requirementCode}/${randomUUID()}.${EXTENSION_BY_MIME[mimeType]}`;
}

export interface StorageDriver {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  /** Зөвхөн s3 driver-т байна. Байвал файлыг сервер дундуур явуулахгүй. */
  presignGet?(key: string, fileName: string): Promise<string>;
}

// --- Локал диск -------------------------------------------------------------

const LOCAL_ROOT = resolve(process.cwd(), "data", "uploads");

/** Түлхүүр нь дотооддоо үүсдэг ч гаднаас ирсэн утга гэж үзэж давхар шалгана. */
function localPath(key: string): string {
  const path = resolve(LOCAL_ROOT, key);
  if (path !== LOCAL_ROOT && !path.startsWith(LOCAL_ROOT + sep)) {
    throw new Error("Файлын зам буруу байна.");
  }
  return path;
}

const localDriver: StorageDriver = {
  async put(key, data) {
    const path = localPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  },
  async read(key) {
    return readFile(localPath(key));
  },
  async remove(key) {
    await unlink(localPath(key)).catch(() => undefined);
  },
};

// --- MinIO / S3 -------------------------------------------------------------

const GET_EXPIRES_SECONDS = 10 * 60;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} тохируулаагүй байна. .env файлаа шалгана уу.`);
  }
  return value;
}

async function s3Module() {
  const [client, presigner] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
  ]);
  return { ...client, ...presigner };
}

let internalClient: S3Client | undefined;
let publicClient: S3Client | undefined;

async function createS3Client(endpoint: string): Promise<S3Client> {
  const { S3Client: Client } = await s3Module();
  return new Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
  });
}

/** Апп -> MinIO дотоод сүлжээгээр (put, read, remove). */
async function getInternalClient(): Promise<S3Client> {
  internalClient ??= await createS3Client(requireEnv("S3_ENDPOINT"));
  return internalClient;
}

/**
 * Presigned URL үүсгэх клиент. Гарын үсэг зурахад хост нь URL-д ордог тул
 * заавал браузерын хандаж чадах нийтийн хаягаар үүсгэнэ — дотоод хаягаар
 * (жишээ нь http://minio:9000) presign хийвэл браузер хандаж чадахгүй.
 */
async function getPublicClient(): Promise<S3Client> {
  publicClient ??= await createS3Client(
    process.env.S3_PUBLIC_ENDPOINT ?? requireEnv("S3_ENDPOINT"),
  );
  return publicClient;
}

const s3Driver: StorageDriver = {
  async put(key, data, mimeType) {
    const { PutObjectCommand } = await s3Module();
    const client = await getInternalClient();
    await client.send(
      new PutObjectCommand({
        Bucket: requireEnv("S3_BUCKET"),
        Key: key,
        Body: data,
        ContentType: mimeType,
      }),
    );
  },

  async read(key) {
    const { GetObjectCommand } = await s3Module();
    const client = await getInternalClient();
    const result = await client.send(
      new GetObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Файл олдсонгүй.");
    return Buffer.from(bytes);
  },

  async remove(key) {
    const { DeleteObjectCommand } = await s3Module();
    const client = await getInternalClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: key }),
    );
  },

  async presignGet(key, fileName) {
    const { GetObjectCommand, getSignedUrl } = await s3Module();
    const client = await getPublicClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: requireEnv("S3_BUCKET"),
        Key: key,
        ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      }),
      { expiresIn: GET_EXPIRES_SECONDS },
    );
  },
};

export const storage: StorageDriver =
  process.env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;
