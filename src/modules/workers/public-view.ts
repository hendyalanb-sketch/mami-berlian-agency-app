import type { BridgeRecord } from "@/modules/bridge/content-bridge-service";
import { decodeStringList } from "@/modules/enrichment/serialization";
import type { getWorkerMasterOptions } from "@/modules/master-data/service";
import { assertNoForbiddenKeys, toPublicProjection } from "@/modules/privacy/public-projection";
import type { RegisterWorker } from "@/modules/workers/source-service";
type Master = Awaited<ReturnType<typeof getWorkerMasterOptions>>;
export function buildPublicWorkerView(worker: RegisterWorker, bridge: BridgeRecord | null, master: Master) {
  const category = master.categories.find((row) => row.code === String(bridge?.category ?? ""));
  const skillCodes = decodeStringList(bridge?.skills);
  const placementCode = decodeStringList(bridge?.placement_preferences)[0] ?? "";
  const placement = master.placements.find((row) => row.code === placementCode);
  const skills = skillCodes.map((code) => master.skills.find((row) => row.code === code)?.name ?? code);
  const projection = toPublicProjection({
    worker_register: worker.workerRegister,
    name: worker.name,
    age: worker.age ? `${worker.age} Tahun` : "",
    origin: worker.origin,
    category: category?.name ?? String(bridge?.category ?? ""),
    skills,
    placement: placement?.name ?? placementCode,
    salary: String(bridge?.salary_display ?? ""),
    photo_asset_id: String(bridge?.profile_photo_drive_id ?? ""),
  });
  assertNoForbiddenKeys(projection);
  return projection;
}
