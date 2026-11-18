import { describe, expect, it } from "vitest";
import { buildWorkflowSteps, currentWorkflowStep } from "@/modules/workflow/steps";

const allData = { category: true, experience: true, skills: true, placement: true, salary: true, publication_consent: true };
const states = (steps: ReturnType<typeof buildWorkflowSteps>) => Object.fromEntries(steps.map((step) => [step.key, step.state]));

describe("buildWorkflowSteps", () => {
  it("starts at data when nothing is filled; photo stays actionable", () => {
    const steps = buildWorkflowSteps({ checks: {}, contentStatus: "INCOMPLETE", approved: false });
    expect(states(steps)).toEqual({ data: "current", photo: "todo", approve: "locked", generate: "locked", export: "locked", publish: "locked" });
  });

  it("moves to photo when data is complete", () => {
    const steps = buildWorkflowSteps({ checks: allData, contentStatus: "INCOMPLETE", approved: false });
    expect(currentWorkflowStep(steps)?.key).toBe("photo");
  });

  it("asks for approval when data and photo are complete", () => {
    const steps = buildWorkflowSteps({ checks: { ...allData, profile_photo: true }, contentStatus: "READY", approved: false });
    expect(currentWorkflowStep(steps)?.key).toBe("approve");
    expect(steps.find((step) => step.key === "generate")?.hint).toContain("belum disetujui");
  });

  it("marks generate as error after a failed generation", () => {
    const steps = buildWorkflowSteps({ checks: { ...allData, profile_photo: true }, contentStatus: "ERROR", approved: true });
    expect(states(steps).generate).toBe("error");
  });

  it("walks through export and publish", () => {
    const checks = { ...allData, profile_photo: true };
    expect(currentWorkflowStep(buildWorkflowSteps({ checks, contentStatus: "GENERATED", approved: true }))?.key).toBe("export");
    expect(currentWorkflowStep(buildWorkflowSteps({ checks, contentStatus: "ARCHIVED", approved: true }))?.key).toBe("publish");
    expect(currentWorkflowStep(buildWorkflowSteps({ checks, contentStatus: "PUBLISHED", approved: true }))).toBeNull();
  });
});
