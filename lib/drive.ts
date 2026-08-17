import { google } from "googleapis";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

interface DriveFilesApi {
  list(params: unknown): Promise<{ data: { files?: Partial<DriveFile>[] } }>;
  get(params: unknown): Promise<{ data: Buffer }>;
}

interface DriveClient {
  files: DriveFilesApi;
}

let cachedClient: DriveClient | null = null;

// Test-only seam: lets lib/drive.test.ts inject a fake Drive API client.
export function __setDriveClientForTests(client: DriveClient | null): void {
  cachedClient = client;
}

function buildClient(): DriveClient {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!keyBase64) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set");
  }
  const credentials = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });
  return {
    files: {
      list: (params: unknown) => drive.files.list(params as never) as never,
      get: (params: unknown) => drive.files.get(params as never) as never,
    },
  };
}

function getClient(): DriveClient {
  if (!cachedClient) cachedClient = buildClient();
  return cachedClient;
}

function requireFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is not set");
  return folderId;
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  const client = getClient();
  const folderId = requireFolderId();
  const response = await client.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink)",
    pageSize: 100,
  });
  return (response.data.files ?? []).map((f) => ({
    id: f.id ?? "",
    name: f.name ?? "",
    mimeType: f.mimeType ?? "",
    webViewLink: f.webViewLink ?? "",
  }));
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.files.get({
    fileId,
    alt: "media",
    responseType: "arraybuffer" as never,
  });
  return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data as never);
}
