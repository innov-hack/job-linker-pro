import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt from Python template - concise and focused
const QUESTION_SYSTEM_PROMPT = `You are an expert technical recruiter. Generate concise, role-relevant interview questions.
Output a JSON array of strings (no extra keys, no markdown).`;

// Extract keywords from job spec for dynamic fallback questions
function extractKeywords(text: string): string[] {
  const candidates = [
    "distributed systems", "microservices", "kubernetes", "docker", "grpc",
    "go", "java", "c++", "python", "sql", "nosql", "cloud", "performance",
    "scalability", "reliability", "react", "node", "typescript", "javascript",
    "aws", "azure", "gcp", "machine learning", "data science", "api",
  ];
  const lowered = text.toLowerCase();
  const hits = candidates.filter(item => lowered.includes(item));
  return hits.length > 0 ? hits : ["backend systems", "system design", "performance"];
}

// Extract capitalized phrases (company names, technologies) from CV
function extractCapitalizedPhrases(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}/g) || [];
  const deduped: string[] = [];
  for (const match of matches) {
    if (!deduped.includes(match)) {
      deduped.push(match);
    }
  }
  return deduped.slice(0, 5);
}

// Generate dynamic fallback questions based on job spec and CV
function getFallbackQuestions(jobSpecText: string, cvText: string, count: number): string[] {
  const keywords = extractKeywords(jobSpecText);
  const orgs = extractCapitalizedPhrases(cvText);
  const focus = keywords[0] || "scalable backend services";
  const org = orgs[0] || "a recent role";

  const baseQuestions = [
    `Describe your experience with ${focus} in production systems.`,
    "Tell us about a project where you improved latency, throughput, or reliability.",
    "How have you designed or operated distributed systems at scale?",
    `Your resume mentions ${org}. What was your most impactful contribution there?`,
    "Which job requirements are you least familiar with, and how would you ramp up quickly?",
    "Share an example of collaborating with SRE, security, or product partners on a launch.",
    "Walk through a tough debugging incident and how you resolved it.",
    "What would your 30-60-90 day plan look like for this role?",
  ];
  return baseQuestions.slice(0, count);
}

// Check if a line is a prompt leak
function isPromptLeak(lowered: string): boolean {
  if (lowered.startsWith("analysis") || lowered.startsWith("we need") || 
      lowered.startsWith("let's") || lowered.startsWith("should be") ||
      lowered.startsWith("questions:") || lowered.startsWith("6 questions")) {
    return true;
  }
  if (lowered.startsWith("you are ")) return true;
  if (lowered.startsWith("output") || lowered.startsWith("provide just") || lowered.startsWith("generate")) {
    return true;
  }
  if (lowered.includes("output json") || lowered.includes("json array")) return true;
  if (lowered.includes("job spec text") || lowered.includes("cv text")) return true;
  if (lowered.includes("system prompt")) return true;
  if (lowered.startsWith("system:") || lowered.startsWith("assistant:") || lowered.startsWith("user:")) {
    return true;
  }
  return false;
}

// Clean question line - remove numbering, bullets, quotes
function cleanQuestionLine(line: string): string {
  let cleaned = line.replace(/^\s*[-*]\s*/, "");
  cleaned = cleaned.replace(/^\s*\d+\s*[).:-]\s*/, "");
  cleaned = cleaned.trim().replace(/^["']|["']$/g, "");
  return cleaned.length >= 8 ? cleaned : "";
}

// Sanitize questions - remove duplicates and prompt leaks
function sanitizeQuestions(questions: string[]): string[] {
  const sanitized: string[] = [];
  const seen = new Set<string>();
  
  for (const question of questions) {
    if (!question) continue;
    const lowered = question.toLowerCase().trim();
    if (isPromptLeak(lowered)) continue;
    if (seen.has(question)) continue;
    seen.add(question);
    sanitized.push(question);
  }
  return sanitized;
}

// Parse questions from AI response
function parseQuestions(content: string): string[] {
  if (!content) return [];

  // Try to parse as JSON array first
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (typeof item === "string") return cleanQuestionLine(item);
        if (typeof item === "object" && item.question) return cleanQuestionLine(item.question);
        if (typeof item === "object" && item.text) return cleanQuestionLine(item.text);
        return "";
      }).filter(Boolean);
    }
  } catch {}

  // Try to extract JSON array from response
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(content.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === "string") return cleanQuestionLine(item);
          if (typeof item === "object" && item.question) return cleanQuestionLine(item.question);
          return "";
        }).filter(Boolean);
      }
    } catch {}
  }

  // Fallback: parse line by line
  const candidates: string[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("analysis") || lower.startsWith("we need") || 
        lower.startsWith("output") || lower.startsWith("let's craft") ||
        lower.startsWith("should be") || lower.startsWith("provide just") ||
        lower.startsWith("json") || lower.startsWith("questions:") ||
        lower.startsWith("6 questions")) {
      continue;
    }
    const cleaned = cleanQuestionLine(line);
    if (cleaned) candidates.push(cleaned);
  }
  return candidates;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText, jobTitle, jobDescription, jobRequirements } = await req.json();
    
    const FEATHERLESS_API_KEY = Deno.env.get("FEATHERLESS_API_KEY");
    if (!FEATHERLESS_API_KEY) {
      throw new Error("FEATHERLESS_API_KEY is not configured");
    }

    const jobSpecText = `${jobTitle || ""}\n${jobDescription || ""}\n${jobRequirements || ""}`;
    const targetCount = 5;

    // User prompt from Python template
    const userPrompt = `Job spec text:
${jobSpecText}

CV text:
${cvText || "CV not provided"}

Generate ${targetCount} questions.`;

    console.log("Generating questions with Featherless AI (Qwen2.5-72B-Instruct)...");

    const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://talently.app",
        "X-Title": "Talently Interview Questions Generator",
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [
          { role: "system", content: QUESTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response:", content);

    // Parse and sanitize questions
    let questions = sanitizeQuestions(parseQuestions(content));

    // Fill with fallback questions if needed
    if (questions.length < targetCount) {
      const fallback = getFallbackQuestions(jobSpecText, cvText || "", targetCount);
      for (const item of fallback) {
        if (questions.length >= targetCount) break;
        if (!questions.includes(item)) {
          questions.push(item);
        }
      }
    }

    // Use only fallback if parsing failed completely
    if (questions.length === 0) {
      console.log("Parse failed, using fallback questions");
      questions = getFallbackQuestions(jobSpecText, cvText || "", targetCount);
    }

    questions = questions.slice(0, targetCount);
    console.log("Generated questions:", questions);

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating questions:", error);
    
    // Return fallback questions on error
    const fallbackQuestions = [
      "Describe your experience with scalable backend services in production systems.",
      "Tell us about a project where you improved latency, throughput, or reliability.",
      "How have you designed or operated distributed systems at scale?",
      "Walk through a tough debugging incident and how you resolved it.",
      "What would your 30-60-90 day plan look like for this role?",
    ];
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate questions",
        questions: fallbackQuestions
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
