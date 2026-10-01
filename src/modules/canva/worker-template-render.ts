import type { BridgeRecord } from "@/modules/bridge/content-bridge-service";
import type { CanvaAutofillValue } from "@/modules/canva/rest";
import type { CanvaWorkerTemplateCode } from "@/modules/canva/template-health";

type PublicWorkerView = {
  worker_register: string;
  name: string;
  age: string;
  origin: string;
  category: string;
  skills: string[];
  placement: string;
  salary: string;
};

function text(text: unknown, max = 120): CanvaAutofillValue {
  return { type: "text", text: String(text ?? "").trim().slice(0, max) };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

export function buildWorkerTemplateAutofill(input: {
  templateCode: CanvaWorkerTemplateCode;
  assetId: string;
  view: PublicWorkerView;
  bridge: BridgeRecord;
  experienceLabel?: string;
}): Record<string, CanvaAutofillValue> {
  const { templateCode, assetId, view, bridge } = input;
  const experienceLabel = String(input.experienceLabel ?? "").trim();
  const readyStatus = "Siap Interview";
  const specialty = String(bridge.worker_specialty ?? view.category ?? "").trim();
  const liveInStatus = String(bridge.live_in_status ?? "").trim();
  const workerQuote = String(bridge.public_description ?? "").trim();
  const publicTitle = String(bridge.public_title ?? "").trim();
  const availability = String(bridge.availability ?? "").trim();
  const trainingStatus = String(bridge.training_status ?? "").trim();
  const documentStatus = String(bridge.document_status ?? "").trim();
  const profileLine = [view.category, experienceLabel].filter(Boolean).join(" • ");

  const common: Record<string, CanvaAutofillValue> = {
    WORKER_PHOTO: { type: "image", asset_id: assetId },
    WORKER_CODE: text(view.worker_register, 30),
  };

  if (templateCode === "MB-01A") {
    return {
      ...common,
      WORKER_HEADLINE: text(`Kenalan dengan ${firstName(view.name)}`, 45),
      WORKER_ORIGIN: text(view.origin, 30),
      WORKER_SPECIALTY: text(specialty, 32),
      WORKER_LIVE_IN_STATUS: text(liveInStatus, 28),
      WORKER_INTRO_QUOTE: text(workerQuote, 120),
      WORKER_AGE: text(view.age, 18),
      WORKER_READY_STATUS: text(readyStatus, 24),
    };
  }

  return {
    ...common,
    WORKER_PROFILE_LINE: text(profileLine, 55),
    WORKER_SKILL_1: text(view.skills[0] ?? "", 48),
    WORKER_HEADLINE: text(publicTitle || `${view.category} siap interview`, 72),
    WORKER_NAME: text(view.name, 36),
    WORKER_AVAILABILITY: text(availability, 54),
    WORKER_LIVE_IN_STATUS: text(liveInStatus, 32),
    WORKER_TRAINING_STATUS: text(trainingStatus, 42),
    WORKER_SKILL_2: text(view.skills[1] ?? "", 48),
    WORKER_DOCUMENT_STATUS: text(documentStatus, 42),
  };
}
