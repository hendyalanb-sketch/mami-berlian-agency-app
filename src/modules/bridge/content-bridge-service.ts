import { appendValues, readValues, updateValues } from "@/modules/google/sheets-rest";

export const BRIDGE_COLUMNS = [
  "worker_register","worker_name","source_row","source_updated_at","category","experience_level","skills","placement_preferences","salary_zone","salary_min","salary_max","salary_display","rate_version","public_title","public_description","profile_photo_drive_id","profile_photo_url","fullbody_photo_drive_id","fullbody_photo_url","publication_consent","content_status","canva_template_key","canva_template_version","canva_design_id","canva_design_url","export_drive_id","export_drive_url","approved_by","approved_at","generated_at","published_at","published_channel","last_updated_by","last_updated_at","notes",
] as const;

export type BridgeRecord = Partial<Record<(typeof BRIDGE_COLUMNS)[number], string | number | boolean>> & { worker_register: string };

function toRow(record: BridgeRecord) {
  return BRIDGE_COLUMNS.map((key) => record[key] ?? "");
}

export class ContentBridgeService {
  constructor(private readonly input: { spreadsheetId: string; accessToken: string; sheetName?: string }) {}

  async upsert(record: BridgeRecord) {
    const sheet = this.input.sheetName ?? "Content Bridge";
    const { values = [] } = await readValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A2:A1000`, accessToken: this.input.accessToken });
    const rowOffset = values.findIndex((row) => row[0]?.trim() === record.worker_register.trim());
    const row = toRow({ ...record, last_updated_at: record.last_updated_at ?? new Date().toISOString() });

    if (rowOffset >= 0) {
      const rowNumber = rowOffset + 2;
      return updateValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A${rowNumber}:AI${rowNumber}`, values: [row], accessToken: this.input.accessToken });
    }
    return appendValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A:AI`, values: [row], accessToken: this.input.accessToken });
  }
}
