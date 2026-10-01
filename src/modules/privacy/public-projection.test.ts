import { describe, expect, it } from "vitest";
import { assertNoForbiddenKeys, toPublicProjection } from "./public-projection";

describe("public projection privacy",()=>{
  it("keeps only publication fields",()=>{
    const value=toPublicProjection({worker_register:"PMBA-0617-ART",name:"SUMIN",age:"49 Tahun",origin:"Kediri",category:"ART Momong Berpengalaman",skills:["Masak"],placement:"Seluruh Indonesia",salary:"Rp2,9–4,0 juta",photo_asset_id:"asset"});
    expect(()=>assertNoForbiddenKeys(value)).not.toThrow();
  });
  it("rejects forbidden PII keys",()=>{expect(()=>assertNoForbiddenKeys({name:"A",no_ktp:"123"})).toThrow(/Forbidden public field/)});
});
