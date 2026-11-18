export type PublicWorkerProjection = {
  worker_register: string;
  name: string;
  age: string;
  origin: string;
  category: string;
  skills: string[];
  placement: string;
  salary: string;
  photo_asset_id: string;
};

export function toPublicProjection(input: PublicWorkerProjection): PublicWorkerProjection {
  return {
    worker_register: input.worker_register,
    name: input.name,
    age: input.age,
    origin: input.origin,
    category: input.category,
    skills: [...input.skills],
    placement: input.placement,
    salary: input.salary,
    photo_asset_id: input.photo_asset_id,
  };
}

export function assertNoForbiddenKeys(value: unknown) {
  const forbidden = /(^|_)(nik|ktp|alamat|address|phone|handphone|kontak_darurat|emergency_contact|scan_ktp|scan_kk)($|_)/i;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (forbidden.test(key)) throw new Error(`Forbidden public field: ${key}`);
      visit(child);
    }
  };
  visit(value);
}
