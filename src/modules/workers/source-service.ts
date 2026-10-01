import { readValues } from "@/modules/google/sheets-rest";
import { canonicalizeWorkerRegister, resolveLegacyCategory } from "./register-normalization";

export type RegisterWorker = {
  sourceRow: number; workerRegister: string; workerRegisterRaw: string; legacyCategoryCode: string | null;
  categoryHint: "ART" | "BABYSITTER" | "SUSTER_LANSIA" | null; categoryMappingRequired: boolean; infalHint: boolean;
  appliedAt: string; name: string; birth: string; age: string; origin: string; height: string; weight: string;
  education: string; lastWork: string; status: string; recruiter: string;
};
const COL={workerRegister:1,appliedAt:2,name:3,birth:4,age:5,origin:9,height:10,weight:11,education:15,lastWork:16,status:17,recruiter:18} as const;
function cell(row:string[],index:number){return row[index]?.trim()??"";}
function normalize(value:string){return value.normalize("NFKD").toLocaleLowerCase("id-ID").trim();}
function toWorker(row:string[],sourceRow:number):RegisterWorker{const workerRegisterRaw=row[COL.workerRegister]??"";const workerRegister=canonicalizeWorkerRegister(workerRegisterRaw);const category=resolveLegacyCategory(workerRegister);return{sourceRow,workerRegister,workerRegisterRaw,legacyCategoryCode:category.sourceCode,categoryHint:category.targetCode,categoryMappingRequired:Boolean(category.sourceCode&&!category.mapped),infalHint:category.infalHint,appliedAt:cell(row,COL.appliedAt),name:cell(row,COL.name),birth:cell(row,COL.birth),age:cell(row,COL.age),origin:cell(row,COL.origin),height:cell(row,COL.height),weight:cell(row,COL.weight),education:cell(row,COL.education),lastWork:cell(row,COL.lastWork),status:cell(row,COL.status),recruiter:cell(row,COL.recruiter)};}

export class WorkerSourceService {
  constructor(private readonly input:{spreadsheetId:string;accessToken:string;sheetName?:string}){}
  private get sheet(){return this.input.sheetName??"Register Pekerja";}
  async getByRegister(workerRegister:string):Promise<RegisterWorker|null>{
    const target=canonicalizeWorkerRegister(workerRegister);
    for(let start=2;start<=999;start+=200){const end=Math.min(start+199,999);const {values=[]}=await readValues({spreadsheetId:this.input.spreadsheetId,range:`'${this.sheet}'!A${start}:S${end}`,accessToken:this.input.accessToken});for(let offset=0;offset<values.length;offset++){if(canonicalizeWorkerRegister(values[offset][COL.workerRegister]??"")===target)return toWorker(values[offset],start+offset);}if(values.length<end-start+1)break;}
    return null;
  }
  async search(query:string,limit=20):Promise<RegisterWorker[]>{const needle=normalize(query);if(needle.length<2)return[];const matches:RegisterWorker[]=[];for(let start=2;start<=999&&matches.length<limit;start+=200){const end=Math.min(start+199,999);const {values=[]}=await readValues({spreadsheetId:this.input.spreadsheetId,range:`'${this.sheet}'!A${start}:S${end}`,accessToken:this.input.accessToken});values.forEach((row,offset)=>{if(matches.length>=limit)return;const searchable=[cell(row,COL.workerRegister),cell(row,COL.name),cell(row,COL.origin),cell(row,COL.status)].map(normalize).join(" ");if(searchable.includes(needle))matches.push(toWorker(row,start+offset));});if(values.length<end-start+1)break;}return matches;}
}
