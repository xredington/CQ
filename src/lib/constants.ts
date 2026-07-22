import type {
  Industry,
  PostCategory,
  SolutionCategory,
} from "@/lib/database.types";

export const INDUSTRY_LABELS: Record<Industry, string> = {
  "banking-financial-services": "Banking & financial services",
  "oil-gas": "Oil & gas",
  government: "Government",
  hospitality: "Hospitality",
  healthcare: "Healthcare",
  retail: "Retail",
  manufacturing: "Manufacturing",
  telecom: "Telecom",
  education: "Education",
  technology: "Technology",
  other: "Other",
};

export const INDUSTRIES = Object.keys(INDUSTRY_LABELS) as Industry[];

export const SOLUTION_CATEGORY_LABELS: Record<SolutionCategory, string> = {
  copilot: "Copilot",
  "productivity-ai": "Productivity AI",
  "security-ai": "Security AI",
  "data-analytics": "Data & analytics",
  "industry-solution": "Industry solution",
  infrastructure: "Infrastructure",
  other: "Other",
};

export const SOLUTION_CATEGORIES = Object.keys(
  SOLUTION_CATEGORY_LABELS
) as SolutionCategory[];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  copilot: "Copilot",
  "ai-use-cases": "AI use cases",
  "implementation-help": "Implementation help",
  general: "General",
};

export const POST_CATEGORIES = Object.keys(
  POST_CATEGORY_LABELS
) as PostCategory[];

/** [DECISION NEEDED] Stakeholder contact for the not-on-allowlist message. */
export const CONTACT_EMAIL = "codehive@redington.example.com";

export const DEFAULT_TIMEZONE = "Asia/Dubai";
