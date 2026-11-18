import { notFound } from "next/navigation";
import { DevUiGallery } from "./gallery";

// Galeri komponen dev-only (Keputusan D2, docs/UI_UX_PLAN.md). Tidak tersedia di production.
export const metadata = { title: "Galeri UI (dev)" };

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevUiGallery />;
}
