import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    if (!apiKey) {
      console.error("FEATHERLESS_API_KEY not configured");
      // Return a default score if API key is not configured
      return new Response(
        JSON.stringify({ score: 75, breakdown: "API key not configured, using default score" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Q&A pairs for evaluation
    const qaPairs = questions.map((q: string, i: number) => 
      `Question ${i + 1}: ${q}\nAnswer ${i + 1}: ${answers[i]}`
    ).join("\n\n");

    const systemPrompt = `You are an expert HR evaluator assessing candidate responses to interview questions.

Your task is to evaluate the quality of answers based on these criteria:

1. **Relevance** (0-20): How well does the answer address the specific question asked?
2. **Depth & Specificity** (0-20): Does the answer provide concrete examples, metrics, or specific experiences? Generic or vague answers score low.
3. **Communication** (0-20): Is the answer clear, well-structured, and professional?
4. **Job Fit** (0-20): Does the answer demonstrate skills/experience directly relevant to THIS specific role and its requirements?
5. **Enthusiasm & Insight** (0-20): Does the candidate show genuine interest, understanding of the role, and thoughtful reflection?

CRITICAL SCORING RULES:
- **SEVERELY PENALIZE** answers that are:
  - Very short (under 20 words): Maximum 5 points per category
  - Generic/templated (could apply to any job): Maximum 10 points per category
  - Vague with no specific examples: Maximum 10 points per category
  - Placeholder text like "test", "asdf", or random characters: Score 0
  - Not addressing the question at all: Score 0 for that answer
  
- **REWARD** answers that:
  - Reference specific requirements mentioned in the job description
  - Include concrete examples with measurable outcomes
  - Show understanding of the company/role context
  - Demonstrate thoughtful reflection on their experience

A strong candidate should score 70-100. An average candidate 40-69. Poor responses should score below 40.
Empty, placeholder, or nonsensical answers MUST score 0-10.

CRITICAL: You must respond with ONLY a valid JSON object in this exact format:
{
  "score": <number between 0-100>,
  "breakdown": "<2-3 sentences: mention specific strengths or weaknesses from their actual answers, reference the job requirements where relevant>"
}

Do not include any text before or after the JSON object.`;

    const userPrompt = `Evaluate these interview answers for the position of "${jobTitle}".

JOB CONTEXT (use this to assess job fit):
- Description: ${jobDescription || "Not provided"}
- Requirements: ${jobRequirements || "Not provided"}

CANDIDATE'S RESPONSES:
${qaPairs}

IMPORTANT: 
- Be strict with short or generic answers
- Reference specific content from their answers in your breakdown
- Consider how well answers align with the job requirements above
- Provide a personalized assessment, not generic feedback

Provide your evaluation as a JSON object.`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Featherless API error:", response.status, errorText);
      
      // Return a reasonable default score on API error
      return new Response(
        JSON.stringify({ score: 70, breakdown: "Evaluation service temporarily unavailable" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    console.log("Raw AI evaluation response:", aiResponse);

    // Parse the JSON response
    let evaluation = { score: 70, breakdown: "Unable to parse evaluation" };
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100) {
          evaluation = {
            score: Math.round(parsed.score),
            breakdown: parsed.breakdown || "Evaluation completed"
          };
        }
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Extract score from text if JSON parsing fails
      const scoreMatch = aiResponse.match(/score[:\s]*(\d+)/i);
      if (scoreMatch) {
        evaluation.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
      }
    }

    console.log("Final evaluation:", evaluation);

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in evaluate-answers function:", error);
    return new Response(
      JSON.stringify({ score: 70, breakdown: "Error during evaluation" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});