import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiCoachService, isAiConfigured } from "../server/aiCoach";

// vi.mock is hoisted above imports, so the mock fn must be hoisted too.
const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    beta = { messages: { create } };
  }
  return { default: Anthropic };
});


beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  create.mockReset();
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe("AI Coach on Claude", () => {
  it("is disabled without an API key", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isAiConfigured()).toBe(false);
  });

  it("sends a structured-output request with refusal fallbacks and parses the reply", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "", signature: "x" },
        {
          type: "text",
          text: JSON.stringify({
            message: "Start with customer interviews.",
            sources: ["Customer Interview Guide"],
            confidence: 0.9,
            suggestedActions: ["Book 5 interviews"],
          }),
        },
      ],
    });

    const reply = await aiCoachService.generateResponse(
      [{ role: "user", content: "How do I validate my idea?" }],
      "ideation",
      "participant",
      "en",
    );

    expect(reply.message).toBe("Start with customer interviews.");
    expect(reply.suggestedActions).toEqual(["Book 5 interviews"]);

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.fallbacks).toBe("default");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.output_config.effort).toBe("low");
    expect(params.messages).toEqual([{ role: "user", content: "How do I validate my idea?" }]);
    expect(params.system).toContain("ideation");
    expect(params).not.toHaveProperty("temperature");
  });

  it("tells the coach which program week the participant is in", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ message: "ok", sources: [], confidence: 1, suggestedActions: [] }) }],
    });
    await aiCoachService.generateResponse([{ role: "user", content: "hi" }], "process_guide", "participant", "en", 3);
    expect(create.mock.calls[0][0].system).toContain("week 3 of 8");
  });

  it("answers politely when Claude declines", async () => {
    create.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const reply = await aiCoachService.generateResponse([{ role: "user", content: "x" }]);
    expect(reply.confidence).toBe(0);
    expect(reply.suggestedActions).toEqual(["Contact mentor"]);
  });

  it("falls back to a friendly error when the API fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("network down"));
    const reply = await aiCoachService.generateResponse([{ role: "user", content: "x" }]);
    expect(reply.message).toMatch(/technical difficulties/);
  });

  it("analyzes a project at medium effort", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ strengths: ["a"], improvements: ["b"], nextSteps: ["c"], readinessScore: 42 }) }],
    });
    const analysis = await aiCoachService.analyzeProject({
      name: "P", stage: "ideation", summary: null, problem: null, solution: null,
      market: null, aiComponents: null, dataNeeds: null, risks: null, ethics: null,
    });
    expect(analysis.readinessScore).toBe(42);
    expect(create.mock.calls[0][0].output_config.effort).toBe("medium");
  });
});
