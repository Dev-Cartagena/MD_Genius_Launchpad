import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-default_key"
});

export interface AiCoachMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: string[];
}

export interface AiCoachResponse {
  message: string;
  sources: string[];
  confidence: number;
  suggestedActions?: string[];
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
    mode: "process_guide" | "ideation" | "technical" | "gtm" | "pitch" = "process_guide",
    userRole: string = "participant",
    locale: string = "en"
  ): Promise<AiCoachResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(mode, userRole, locale);
      const contextualKnowledge = this.knowledgeBase[mode];
      
      const openaiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        message: result.message || "I'm here to help! Could you please rephrase your question?",
        sources: result.sources || contextualKnowledge.templates.slice(0, 2),
        confidence: result.confidence || 0.8,
        suggestedActions: result.suggestedActions || []
      };
    } catch (error) {
      console.error("AI Coach error:", error);
      return {
        message: "I'm experiencing some technical difficulties. Please try again or contact a human mentor for assistance.",
        sources: [],
        confidence: 0.0,
        suggestedActions: ["Contact mentor", "Try rephrasing your question"]
      };
    }
  }

  private buildSystemPrompt(
    mode: string,
    userRole: string,
    locale: string
  ): string {
    const basePrompt = `You are an AI Coach for the MD Genius AI Startup Launchpad program. 
    
    Your role is to guide ${userRole}s through their startup journey with expertise in AI/ML development, 
    business strategy, and startup best practices.
    
    Current mode: ${mode}
    User locale: ${locale}
    
    Knowledge context: ${this.knowledgeBase[mode as keyof typeof this.knowledgeBase]?.content}
    
    Guidelines:
    1. Provide practical, actionable advice specific to AI startups
    2. Always cite relevant templates and resources when available
    3. Include confidence scores for your recommendations
    4. For technical questions, focus on practical implementation
    5. For legal/financial advice, always recommend consulting human experts
    6. Encourage responsible AI development and ethical considerations
    7. Respond in ${locale === 'es' ? 'Spanish' : 'English'}
    
    Response format (JSON):
    {
      "message": "Your helpful response here",
      "sources": ["Relevant template 1", "Resource 2"],
      "confidence": 0.85,
      "suggestedActions": ["Action 1", "Action 2"]
    }`;
    
    return basePrompt;
  }

  async analyzeProject(projectData: any): Promise<{
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
    readinessScore: number;
  }> {
    try {
      const prompt = `Analyze this AI startup project and provide structured feedback:
      
      Project: ${JSON.stringify(projectData)}
      
      Evaluate on: technical feasibility, market opportunity, team readiness, AI ethics, business model.
      
      Respond with JSON format containing strengths, improvements, nextSteps, and readinessScore (0-100).`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Project analysis error:", error);
      return {
        strengths: [],
        improvements: ["Unable to analyze project at this time"],
        nextSteps: ["Try again later or consult with a mentor"],
        readinessScore: 0
      };
    }
  }

  async generatePitchFeedback(pitchContent: string): Promise<{
    overallScore: number;
    feedback: { category: string; score: number; comments: string }[];
    suggestions: string[];
  }> {
    try {
      const prompt = `Analyze this pitch content and provide detailed feedback:
      
      Pitch: ${pitchContent}
      
      Evaluate on: problem clarity, solution explanation, market opportunity, technical credibility, 
      business model, AI ethics, competitive advantage, team capability, financial projections.
      
      Provide JSON with overallScore (0-100), detailed feedback per category, and improvement suggestions.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Pitch feedback error:", error);
      return {
        overallScore: 0,
        feedback: [],
        suggestions: ["Unable to analyze pitch content at this time"]
      };
    }
  }
}

export const aiCoachService = new AiCoachService();
