import { describe, expect, it } from "vitest";
import { BRIDGE_COLUMNS, bridgeRowToRecord, mergeBridgeRecord } from "./content-bridge-service";

describe("Content Bridge merge semantics", () => {
  it("preserves existing values when applying a partial patch", () => {
    const merged = mergeBridgeRecord({ worker_register: "PMBA-0617-ART", worker_name: "SUMIN", category: "ART", content_status: "READY" }, { worker_register: "PMBA-0617-ART", content_status: "PUBLISHED", published_channel: "WHATSAPP" });
    expect(merged.worker_name).toBe("SUMIN");
    expect(merged.category).toBe("ART");
    expect(merged.content_status).toBe("PUBLISHED");
    expect(merged.published_channel).toBe("WHATSAPP");
  });
  it("maps a sheet row back to the v3 bridge contract", () => {
    const row = Array(BRIDGE_COLUMNS.length).fill("");
    row[0] = "PMBA-0617-ART"; row[1] = "SUMIN"; row[20] = "READY";
    const record = bridgeRowToRecord(row);
    expect(record?.worker_register).toBe("PMBA-0617-ART");
    expect(record?.worker_name).toBe("SUMIN");
    expect(record?.content_status).toBe("READY");
  });
});
