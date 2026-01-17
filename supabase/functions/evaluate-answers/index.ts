import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt from Python template - strict grading with per-question breakdown
const GRADE_SYSTEM_PROMPT = `You are a strict technical interviewer. Grade each answer on a 1-5 scale and explain briefly.
Output JSON with keys: per_question (list of {question, score, rationale}),
overall_score (1-100), recommendation (short text).`;

// Extract keywords from job spec for fallback grading
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

// Generate rationale based on score
function getFallbackRationale(score: number, answer: string): string {
  if (!answer.trim()) {
    return "No substantive answer provided.";
  }
  if (score >= 5) {
    return "Clear, specific, and aligned with role requirements.";
  }
  if (score >= 4) {
    return "Solid detail with relevant experience.";
  }
  if (score >= 3) {
    return "Some relevant points, but missing depth or specificity.";
  }
  if (score >= 2) {
    return "Limited detail and weak alignment to role needs.";
  }
  return "Insufficient detail to assess fit.";
}

// Fallback grading when AI fails
function fallbackGrades(jobSpecText: string, questions: string[], answers: string[]): {
  per_question: Array<{ question: string; score: number; rationale: string }>;
  overall_score: number;
  recommendation: string;
} {
  const keywords = new Set(extractKeywords(jobSpecText).map(w => w.toLowerCase()));
  const perQuestion: Array<{ question: string; score: number; rationale: string }> = [];
  let totalScore = 0;

  for (let idx = 0; idx < questions.length; idx++) {
    const question = questions[idx];
    const answer = answers[idx] || "";

    let score: number;
    if (!answer.trim()) {
      score = 1;
    } else {
      // Score based on length
      let lengthScore: number;
      if (answer.length < 60) lengthScore = 2;
      else if (answer.length < 140) lengthScore = 3;
      else if (answer.length < 240) lengthScore = 4;
      else lengthScore = 5;

      // Bonus for keywords or metrics
      const hasKeyword = Array.from(keywords).some(word => answer.toLowerCase().includes(word));
      const hasMetric = /\d/.test(answer);
      const bonus = (hasKeyword || hasMetric) ? 1 : 0;
      
      score = Math.min(5, lengthScore + bonus);
    }

    totalScore += score;
    const rationale = getFallbackRationale(score, answer);
    perQuestion.push({ question, score, rationale });
  }

  const overallScore = Math.round((totalScore / Math.max(questions.length, 1)) * 20);
  let recommendation: string;
  if (overallScore >= 80) recommendation = "Strong";
  else if (overallScore >= 60) recommendation = "Moderate";
  else recommendation = "Weak";

  return { per_question: perQuestion, overall_score: overallScore, recommendation };
}

// Format Q&A pairs for the prompt
function formatQA(questions: string[], answers: string[]): string {
  const pairs: string[] = [];
  for (let idx = 0; idx < questions.length; idx++) {
    const answer = answers[idx] || "";
    pairs.push(`Q${idx + 1}: ${questions[idx]}\nA${idx + 1}: ${answer}`);
  }
  return pairs.join("\n\n");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions, answers, jobTitle, jobDescription, jobRequirements } = await req.json();

    console.log("Evaluating candidate answers...");
    console.log("Job Title:", jobTitle);
    console.log("Questions count:", questions?.length);
    console.log("Answers count:", answers?.length);

    if (!questions || !answers || questions.length !== answers.length) {
      return new Response(
        JSON.stringify({ error: "Questions and answers must be provided and match in count" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FEATHERLESS_API_KEY');
    const jobSpecText = `${jobTitle || ""}\n${jobDescription || ""}\n${jobRequirements || ""}`;

    if (!apiKey) {
      console.error("FEATHERLESS_API_KEY not configured, using fallback grading");
      const fallback = fallbackGrades(jobSpecText, questions, answers);
      return new Response(
        JSON.stringify({ 
          score: fallback.overall_score, 
          breakdown: fallback.recommendation,
          per_question: fallback.per_question
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User prompt from Python template
    const userPrompt = `Job spec text:
${jobSpecText}

CV text:
(CV submitted with application)

Q&A:
${formatQA(questions, answers)}`;

    console.log("Calling Featherless AI for evaluation...");

    const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://talently.app',
        'X-Title': 'Talently Answer Evaluator',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: GRADE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Featherless API error:", response.status, errorText);
      
      // Use fallback grading on API error
      const fallback = fallbackGrades(jobSpecText, questions, answers);
      return new Response(
        JSON.stringify({ 
          score: fallback.overall_score, 
          breakdown: "Evaluation service temporarily unavailable - using automated scoring",
          per_question: fallback.per_question
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    console.log("Raw AI evaluation response:", aiResponse);

    // Parse the JSON response
    let evaluation = { 
      score: 70, 
      breakdown: "Unable to parse evaluation",
      per_question: [] as Array<{ question: string; score: number; rationale: string }>
    };
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Check for per_question format (Python template style)
        if (parsed.per_question && Array.isArray(parsed.per_question)) {
          const overallScore = typeof parsed.overall_score === 'number' 
            ? Math.round(parsed.overall_score)
            : Math.round((parsed.per_question.reduce((sum: number, pq: any) => sum + (pq.score || 0), 0) / parsed.per_question.length) * 20);
          
          evaluation = {
            score: Math.min(100, Math.max(0, overallScore)),
            breakdown: parsed.recommendation || "Evaluation completed",
            per_question: parsed.per_question
          };
        }
        // Check for simple score format (existing style)
        else if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100) {
          evaluation = {
            score: Math.round(parsed.score),
            breakdown: parsed.breakdown || parsed.recommendation || "Evaluation completed",
            per_question: []
          };
        }
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      
      // Try to extract score from text if JSON parsing fails
      const scoreMatch = aiResponse?.match(/score[:\s]*(\d+)/i);
      if (scoreMatch) {
        evaluation.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
      } else {
        // Use fallback grading
        const fallback = fallbackGrades(jobSpecText, questions, answers);
        evaluation = {
          score: fallback.overall_score,
          breakdown: fallback.recommendation,
          per_question: fallback.per_question
        };
      }
    }

    console.log("Final evaluation:", evaluation);

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in evaluate-answers function:", error);
    
    // Attempt fallback grading even on unexpected errors
    return new Response(
      JSON.stringify({ 
        score: 70, 
        breakdown: "Error during evaluation - using default score",
        per_question: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
