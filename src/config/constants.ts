export const INTEGRATION_IDS = {
  registerSpreadsheetId: process.env.GOOGLE_REGISTER_SPREADSHEET_ID ?? "",
  bridgeSpreadsheetId: process.env.GOOGLE_BRIDGE_SPREADSHEET_ID ?? "",
  photoFolderId: process.env.GOOGLE_PHOTO_FOLDER_ID ?? "",
  canvaMasterFolderId: process.env.CANVA_MASTER_FOLDER_ID ?? "",
  canvaMb01SourceDesignId: process.env.CANVA_MB01_SOURCE_DESIGN_ID ?? "",
} as const;

export const PUBLIC_WORKER_FIELDS = [
  "worker_register",
  "name",
  "age",
  "origin",
  "category",
  "skills",
  "placement",
  "salary",
  "photo_asset_id",
] as const;

export const FORBIDDEN_PUBLIC_FIELDS = [
  "nik",
  "no_ktp",
  "address",
  "alamat",
  "phone",
  "no_handphone",
  "emergency_contact",
  "kontak_darurat",
  "scan_ktp",
  "scan_kk",
] as const;
