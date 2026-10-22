import Anthropic from "@anthropic-ai/sdk";

/**
 * AI Coach on Claude (Anthropic API).
 *
 * The client is created on first use so a missing ANTHROPIC_API_KEY disables
 * the coach (routes answer 503) instead of crashing the server at startup.
 */
let anthropicClient: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      // Vercel functions stop after 60s; leave room to answer with an error.
      timeout: 50_000,
      maxRetries: 1,
    });
  }
  return anthropicClient;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// Re-runs a request on Anthropic's recommended model when a safety classifier
// declines it, instead of returning the refusal.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type CoachMode = "process_guide" | "ideation" | "technical" | "gtm" | "pitch";

export interface AiCoachMessage {
  // Only user and assistant turns come from clients; the system prompt is
  // always built on the server.
  role: "user" | "assistant";
  content: string;
}

export interface AiCoachResponse {
  message: string;
  sources: string[];
  confidence: number;
  suggestedActions?: string[];
}

export interface ProjectAnalysis {
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  readinessScore: number;
}

const COACH_REPLY_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string", description: "The reply to show the participant (Markdown allowed)." },
    sources: {
      type: "array",
      items: { type: "string" },
      description: "Program templates or resources the reply draws on.",
    },
    confidence: { type: "number", description: "0 to 1: how confident you are in the advice." },
    suggestedActions: {
      type: "array",
      items: { type: "string" },
      description: "Up to 3 short next steps.",
    },
  },
  required: ["message", "sources", "confidence", "suggestedActions"],
  additionalProperties: false,
} as const;

const PROJECT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
    readinessScore: { type: "integer", description: "0 to 100" },
  },
  required: ["strengths", "improvements", "nextSteps", "readinessScore"],
  additionalProperties: false,
} as const;

/** Thrown when Claude declines a request even after the fallback model. */
export class AiRefusalError extends Error {
  constructor() {
    super("The AI Coach can't help with that request.");
  }
}

/** Sends one request and returns the parsed JSON reply. */
async function askForJson<T>(params: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Record<string, unknown>;
  effort: "low" | "medium" | "high";
}): Promise<T> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: params.system,
    messages: params.messages,
    output_config: {
      effort: params.effort,
      format: { type: "json_schema", schema: params.schema },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new AiRefusalError();
  }
  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  return JSON.parse(text) as T;
}

export class AiCoachService {
  private knowledgeBase = {
    process_guide: {
      content: `
        MD Genius AI Startup Launchpad Program Overview:
        - 8-week intensive program for AI startup development
        - Key milestones: Problem Definition → Market Validation → MVP Development → Pitch Preparation
        - Weekly deliverables and mentor check-ins required
        - Focus on responsible AI development and ethics
        - Demo Day at program completion for investor presentations
      `,
      templates: [
        "Lean Canvas Template",
        "Customer Interview Guide", 
        "Problem Definition Framework",
        "Market Validation Checklist"
      ]
    },
    ideation: {
      content: `
        AI Startup Ideation Framework:
        - Identify real-world problems that AI can solve effectively
        - Consider data availability and quality requirements
        - Evaluate computational resources and technical feasibility
        - Assess market readiness for AI solutions
        - Focus on user-centric design and explainable AI
      `,
      templates: [
        "Problem-Solution Fit Canvas",
        "AI Capability Assessment",
        "Market Opportunity Matrix"
      ]
    },
    technical: {
      content: `
        AI/ML Technical Fundamentals:
        - Machine Learning model selection and evaluation metrics
        - Data preprocessing and feature engineering best practices
        - Model training, validation, and testing strategies
        - Deployment considerations for production AI systems
        - Monitoring and maintaining AI models in production
        - AI agents and multi-agent systems architecture
      `,
      templates: [
        "Model Evaluation Framework",
        "Data Pipeline Architecture",
        "Technical Requirements Document"
      ]
    },
    gtm: {
      content: `
        Go-to-Market Strategy for AI Startups:
        - Identify ideal customer profile (ICP) and jobs-to-be-done (JTBD)
        - Develop clear value proposition for AI capabilities
        - Consider ethical AI positioning and trust-building
        - Plan for AI explainability and transparency requirements
        - Address data privacy and security concerns
      `,
      templates: [
        "ICP Definition Template",
        "Value Proposition Canvas",
        "GTM Strategy Framework"
      ]
    },
    pitch: {
      content: `
        AI Startup Pitch Best Practices:
        - Lead with the problem and market opportunity
        - Clearly explain your AI solution and differentiation
        - Address data strategy and competitive advantages
        - Include technical validation and model performance
        - Discuss ethical considerations and responsible AI practices
        - Present clear business model and scaling strategy
      `,
      templates: [
        "Pitch Deck Template",
        "Demo Script Framework",
        "Investor Q&A Preparation"
      ]
    }
  };

  async generateResponse(
    messages: AiCoachMessage[],
    mode: CoachMode = "process_guide",
    userRole: string = "participant",
    locale: string = "en"
  ): Promise<AiCoachResponse> {
    const contextualKnowledge = this.knowledgeBase[mode];
    try {
      const reply = await askForJson<AiCoachResponse>({
        system: this.buildSystemPrompt(mode, userRole, locale),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        schema: COACH_REPLY_SCHEMA,
        // Chat replies don't need deep reasoning; keep them fast and cheap.
        effort: "low",
      });
      return {
        message: reply.message || "I'm here to help! Could you please rephrase your question?",
        sources: reply.sources?.length ? reply.sources : contextualKnowledge.templates.slice(0, 2),
        confidence: typeof reply.confidence === "number" ? reply.confidence : 0.8,
        suggestedActions: reply.suggestedActions ?? [],
      };
    } catch (error) {
      if (error instanceof AiRefusalError) {
        return {
          message: "I can't help with that one. Please reach out to your mentor.",
          sources: [],
          confidence: 0,
          suggestedActions: ["Contact mentor"],
        };
      }
      console.error("AI Coach error:", error);
      return {
        message: "I'm experiencing some technical difficulties. Please try again or contact a human mentor for assistance.",
        sources: [],
        confidence: 0.0,
        suggestedActions: ["Contact mentor", "Try rephrasing your question"]
      };
    }
  }

  private buildSystemPrompt(mode: CoachMode, userRole: string, locale: string): string {
    return `You are the AI Coach for the MD Genius AI Startup Launchpad, an 8-week accelerator for AI startups.
You are talking with a program ${userRole}. Give practical, specific advice for building an AI startup, grounded in the program material below.

Current coaching mode: ${mode}

Program material for this mode:
${this.knowledgeBase[mode].content}

Templates available to participants: ${this.knowledgeBase[mode].templates.join(", ")}.

When advice touches legal, financial or medical decisions, recommend confirming with a qualified human expert. Encourage responsible, ethical AI development.
Reply in ${locale === "es" ? "Spanish" : "English"}.`;
  }

  async analyzeProject(projectData: {
    name: string | null;
    stage: string | null;
    summary: string | null;
    problem: string | null;
    solution: string | null;
    market: string | null;
    aiComponents: string[] | null;
    dataNeeds: string | null;
    risks: string[] | null;
    ethics: string | null;
  }): Promise<ProjectAnalysis> {
    const project = {
      name: projectData.name,
      stage: projectData.stage,
      summary: projectData.summary,
      problem: projectData.problem,
      solution: projectData.solution,
      market: projectData.market,
      aiComponents: projectData.aiComponents,
      dataNeeds: projectData.dataNeeds,
      risks: projectData.risks,
      ethics: projectData.ethics,
    };
    try {
      return await askForJson<ProjectAnalysis>({
        system:
          "You review AI startup projects in the MD Genius 8-week accelerator. Evaluate technical feasibility, market opportunity, team readiness, AI ethics and business model. Be candid and specific.",
        messages: [
          {
            role: "user",
            content: `Analyze this project and give strengths, improvements, next steps and a readiness score from 0 to 100.\n\n<project>\n${JSON.stringify(project, null, 2)}\n</project>`,
          },
        ],
        schema: PROJECT_ANALYSIS_SCHEMA,
        effort: "medium",
      });
    } catch (error) {
      console.error("Project analysis error:", error);
      return {
        strengths: [],
        improvements: ["Unable to analyze project at this time"],
        nextSteps: ["Try again later or consult with a mentor"],
        readinessScore: 0,
      };
    }
  }
}

export const aiCoachService = new AiCoachService();
