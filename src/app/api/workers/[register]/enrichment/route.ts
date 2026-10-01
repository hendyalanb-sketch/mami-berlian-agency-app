import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { canEditWorkers } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/service";
import { ContentBridgeService } from "@/modules/bridge/content-bridge-service";
import { decodeStringList, encodeStringList, parseBridgeBoolean, readinessFromBridge } from "@/modules/enrichment/serialization";
import { getGoogleAccessToken, GoogleConnectionError } from "@/modules/google/oauth-token-service";
import { getWorkerMasterOptions, resolveSalaryForSelection, validateSkillCodes } from "@/modules/master-data/service";
import { WorkerSourceService } from "@/modules/workers/source-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalText = (max: number) => z.string().max(max).optional().default("");
const patchSchema = z.object({
  category: z.string().min(1).max(60),
  experience: z.string().min(1).max(60),
  skills: z.array(z.string().min(1).max(60)).min(1).max(20),
  placement: z.string().min(1).max(60),
  publicationConsent: z.boolean(),
  publicTitle: optionalText(72),
  workerQuote: optionalText(120),
  specialty: optionalText(40),
  liveInStatus: optionalText(32),
  availability: optionalText(54),
  trainingStatus: optionalText(42),
  documentStatus: optionalText(42),
});

async function services(userId: string) {
  const registerId = process.env.GOOGLE_REGISTER_SPREADSHEET_ID;
  const bridgeId = process.env.GOOGLE_BRIDGE_SPREADSHEET_ID;
  if (!registerId || !bridgeId) throw new Error("GOOGLE_SHEETS_NOT_CONFIGURED");
  const accessToken = await getGoogleAccessToken(userId);
  return {
    source: new WorkerSourceService({ spreadsheetId: registerId, accessToken }),
    bridge: new ContentBridgeService({ spreadsheetId: bridgeId, accessToken }),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const { register } = await params;
    const { source, bridge } = await services(session.user.id);
    const worker = await source.getByRegister(decodeURIComponent(register));
    if (!worker) return NextResponse.json({ error: "WORKER_NOT_FOUND" }, { status: 404 });
    const bridgeRecord = await bridge.get(worker.workerRegister);
    const master = await getWorkerMasterOptions();
    return NextResponse.json({
      worker,
      master,
      form: {
        category: String(bridgeRecord?.category ?? worker.categoryHint ?? ""),
        experience: String(bridgeRecord?.experience_level ?? ""),
        skills: decodeStringList(bridgeRecord?.skills),
        placement: decodeStringList(bridgeRecord?.placement_preferences)[0] ?? "",
        publicationConsent: parseBridgeBoolean(bridgeRecord?.publication_consent),
        publicTitle: String(bridgeRecord?.public_title ?? ""),
        workerQuote: String(bridgeRecord?.public_description ?? ""),
        specialty: String(bridgeRecord?.worker_specialty ?? ""),
        liveInStatus: String(bridgeRecord?.live_in_status ?? ""),
        availability: String(bridgeRecord?.availability ?? ""),
        trainingStatus: String(bridgeRecord?.training_status ?? ""),
        documentStatus: String(bridgeRecord?.document_status ?? ""),
      },
      salaryDisplay: String(bridgeRecord?.salary_display ?? ""),
      contentStatus: String(bridgeRecord?.content_status ?? "INCOMPLETE"),
      readiness: readinessFromBridge(bridgeRecord),
    });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "ENRICHMENT_READ_FAILED" }, { status: 502 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ register: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!canEditWorkers(session.user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const { register } = await params;
    const { source, bridge } = await services(session.user.id);
    const worker = await source.getByRegister(decodeURIComponent(register));
    if (!worker) return NextResponse.json({ error: "WORKER_NOT_FOUND" }, { status: 404 });
    const before = await bridge.get(worker.workerRegister);
    if (!(await validateSkillCodes(parsed.data.skills))) return NextResponse.json({ error: "INVALID_SKILL" }, { status: 422 });
    const salary = await resolveSalaryForSelection({
      categoryCode: parsed.data.category,
      experienceCode: parsed.data.experience,
      placementCode: parsed.data.placement,
    });
    if (!salary) return NextResponse.json({ error: "RATE_NOT_FOUND" }, { status: 422 });

    const defaultTitle = `${salary.category.name} siap interview`;
    const proposed = {
      worker_register: worker.workerRegister,
      worker_name: worker.name,
      source_row: worker.sourceRow,
      category: salary.category.code,
      experience_level: salary.experience.code,
      skills: encodeStringList(parsed.data.skills),
      placement_preferences: encodeStringList([salary.placement.code]),
      salary_zone: salary.salaryZoneCode,
      salary_min: salary.rate.min,
      salary_max: salary.rate.max,
      salary_display: salary.salaryDisplay,
      rate_version: salary.rate.version,
      public_title: parsed.data.publicTitle.trim() || defaultTitle,
      public_description: parsed.data.workerQuote.trim(),
      worker_specialty: parsed.data.specialty.trim(),
      live_in_status: parsed.data.liveInStatus.trim(),
      availability: parsed.data.availability.trim(),
      training_status: parsed.data.trainingStatus.trim(),
      document_status: parsed.data.documentStatus.trim(),
      publication_consent: parsed.data.publicationConsent ? "TRUE" : "FALSE",
      last_updated_by: session.user.email ?? session.user.id,
      last_updated_at: new Date().toISOString(),
    };
    const readiness = readinessFromBridge({ ...before, ...proposed });
    const after = { ...proposed, content_status: readiness.status };
    await bridge.upsert(after);
    await writeAudit({
      workerRegister: worker.workerRegister,
      userId: session.user.id,
      action: "ENRICH_WORKER",
      entityType: "CONTENT_BRIDGE",
      entityId: worker.workerRegister,
      before,
      after,
    });
    return NextResponse.json({
      ok: true,
      salaryDisplay: salary.salaryDisplay,
      contentStatus: readiness.status,
      readiness,
      form: { ...parsed.data, publicTitle: proposed.public_title },
    });
  } catch (error) {
    if (error instanceof GoogleConnectionError) return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json({ error: "ENRICHMENT_WRITE_FAILED" }, { status: 502 });
  }
}
