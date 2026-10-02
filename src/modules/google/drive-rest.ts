export type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  trashed?: boolean;
  capabilities?: {
    canAddChildren?: boolean;
    canEdit?: boolean;
    canReadDrive?: boolean;
  };
};

export async function getDriveFileMetadata(input: { accessToken: string; fileId: string }) {
  const fields = "id,name,mimeType,trashed,capabilities(canAddChildren,canEdit,canReadDrive)";
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${input.accessToken}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`DRIVE_METADATA_FAILED:${response.status}`);
  return response.json() as Promise<DriveFileMetadata>;
}

export async function createDriveFolder(input: { accessToken: string; name: string; parentId?: string | null }) {
  const body = {
    name: input.name,
    mimeType: "application/vnd.google-apps.folder",
    ...(input.parentId ? { parents: [input.parentId] } : {}),
  };
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DRIVE_FOLDER_CREATE_FAILED:${response.status}`);
  return response.json() as Promise<{ id: string; name: string; mimeType: string; webViewLink?: string }>;
}

export async function uploadImageToDrive(input: { accessToken: string; folderId: string; fileName: string; contentType: string; bytes: ArrayBuffer }) {
  const boundary = `mba_${crypto.randomUUID().replaceAll("-", "")}`;
  const metadata = JSON.stringify({ name: input.fileName, parents: [input.folderId] });
  const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${input.contentType}\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([prefix, Buffer.from(input.bytes), suffix]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DRIVE_UPLOAD_FAILED:${response.status}`);
  const result = await response.json() as { id: string; name: string; mimeType: string };
  return { ...result, webViewLink: `https://drive.google.com/file/d/${result.id}/view` };
}

export async function downloadDriveFile(input: { accessToken: string; fileId: string }) {
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
}
