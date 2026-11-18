export type SalaryRate = {
  category: string;
  experience: string;
  zone: string;
  min: number;
  max: number;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export function resolveSalaryRate(
  rates: SalaryRate[],
  input: { category: string; experience: string; zone: string; effectiveDate: string },
) {
  const at = new Date(input.effectiveDate).getTime();
  const matches = rates.filter((rate) => {
    const start = new Date(rate.effectiveFrom).getTime();
    const end = rate.effectiveTo ? new Date(rate.effectiveTo).getTime() : Number.POSITIVE_INFINITY;
    return rate.category === input.category && rate.experience === input.experience && rate.zone === input.zone && start <= at && at <= end;
  });
  matches.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  return matches[0] ?? null;
}

export function formatSalaryRange(min: number, max: number) {
  const million = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value / 1_000_000);
  return `Rp${million(min)}–${million(max)} juta`;
}
