import { appendValues, readValues, updateValues } from "@/modules/google/sheets-rest";

export const BRIDGE_COLUMNS = [
  "worker_register","worker_name","source_row","source_updated_at","category","experience_level","skills","placement_preferences","salary_zone","salary_min","salary_max","salary_display","rate_version","public_title","public_description","profile_photo_drive_id","profile_photo_url","fullbody_photo_drive_id","fullbody_photo_url","publication_consent","content_status","canva_template_key","canva_template_version","canva_design_id","canva_design_url","export_drive_id","export_drive_url","approved_by","approved_at","generated_at","published_at","published_channel","last_updated_by","last_updated_at","notes","worker_specialty","live_in_status","availability","training_status","document_status",
] as const;

export type BridgeKey = (typeof BRIDGE_COLUMNS)[number];
export type BridgeRecord = Partial<Record<BridgeKey, string | number | boolean>> & { worker_register: string };

export function bridgeRowToRecord(row: unknown[]): BridgeRecord | null {
  const workerRegister = String(row[0] ?? "").trim();
  if (!workerRegister) return null;
  const record: Partial<Record<BridgeKey, string | number | boolean>> = {};
  BRIDGE_COLUMNS.forEach((key, index) => {
    const value = row[index];
    if (value !== undefined && value !== null && value !== "") record[key] = String(value);
  });
  return { ...record, worker_register: workerRegister } as BridgeRecord;
}

export function mergeBridgeRecord(existing: BridgeRecord | null, patch: BridgeRecord): BridgeRecord {
  return {
    ...(existing ?? {}),
    ...patch,
    worker_register: patch.worker_register,
    last_updated_at: patch.last_updated_at ?? new Date().toISOString(),
  };
}

function toRow(record: BridgeRecord) {
  return BRIDGE_COLUMNS.map((key) => record[key] ?? "");
}

export class ContentBridgeService {
  constructor(private readonly input: { spreadsheetId: string; accessToken: string; sheetName?: string }) {}

  async get(workerRegister: string) {
    const sheet = this.input.sheetName ?? "Content Bridge";
    const { values = [] } = await readValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A2:AN1000`, accessToken: this.input.accessToken });
    const row = values.find((candidate) => candidate[0]?.trim() === workerRegister.trim());
    return row ? bridgeRowToRecord(row) : null;
  }

  async upsert(record: BridgeRecord) {
    const sheet = this.input.sheetName ?? "Content Bridge";
    const { values = [] } = await readValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A2:AN1000`, accessToken: this.input.accessToken });
    const rowOffset = values.findIndex((row) => row[0]?.trim() === record.worker_register.trim());
    const existing = rowOffset >= 0 ? bridgeRowToRecord(values[rowOffset]) : null;
    const merged = mergeBridgeRecord(existing, record);
    const row = toRow(merged);
    if (rowOffset >= 0) {
      const rowNumber = rowOffset + 2;
      return updateValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A${rowNumber}:AN${rowNumber}`, values: [row], accessToken: this.input.accessToken });
    }
    return appendValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A:AN`, values: [row], accessToken: this.input.accessToken });
  }
}
