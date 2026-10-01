import { readValues } from "@/modules/google/sheets-rest";

export type RegisterWorker = {
  sourceRow: number;
  workerRegister: string;
  appliedAt: string;
  name: string;
  birth: string;
  age: string;
  origin: string;
  height: string;
  weight: string;
  education: string;
  lastWork: string;
  status: string;
  recruiter: string;
};

const COL = {
  workerRegister: 1,
  appliedAt: 2,
  name: 3,
  birth: 4,
  age: 5,
  origin: 9,
  height: 10,
  weight: 11,
  education: 15,
  lastWork: 16,
  status: 17,
  recruiter: 18,
} as const;

function cell(row: string[], index: number) { return row[index]?.trim() ?? ""; }
function normalize(value: string) { return value.normalize("NFKD").toLocaleLowerCase("id-ID").trim(); }

export class WorkerSourceService {
  constructor(private readonly input: { spreadsheetId: string; accessToken: string; sheetName?: string }) {}

  async search(query: string, limit = 20): Promise<RegisterWorker[]> {
    const needle = normalize(query);
    if (needle.length < 2) return [];
    const matches: RegisterWorker[] = [];
    const sheet = this.input.sheetName ?? "Register Pekerja";

    for (let start = 2; start <= 999 && matches.length < limit; start += 200) {
      const end = Math.min(start + 199, 999);
      const { values = [] } = await readValues({ spreadsheetId: this.input.spreadsheetId, range: `'${sheet}'!A${start}:S${end}`, accessToken: this.input.accessToken });
      values.forEach((row, offset) => {
        if (matches.length >= limit) return;
        const searchable = [cell(row, COL.workerRegister), cell(row, COL.name), cell(row, COL.origin), cell(row, COL.status)].map(normalize).join(" ");
        if (!searchable.includes(needle)) return;
        matches.push({
          sourceRow: start + offset,
          workerRegister: cell(row, COL.workerRegister),
          appliedAt: cell(row, COL.appliedAt),
          name: cell(row, COL.name),
          birth: cell(row, COL.birth),
          age: cell(row, COL.age),
          origin: cell(row, COL.origin),
          height: cell(row, COL.height),
          weight: cell(row, COL.weight),
          education: cell(row, COL.education),
          lastWork: cell(row, COL.lastWork),
          status: cell(row, COL.status),
          recruiter: cell(row, COL.recruiter),
        });
      });
      if (values.length < end - start + 1) break;
    }
    return matches;
  }
}
