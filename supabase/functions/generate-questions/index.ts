import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const systemPrompt = `You are a senior talent acquisition specialist creating highly personalized interview questions for Talently, an AI-powered recruitment platform.

Your task is to generate exactly 5 deeply personalized interview questions that:

1. **DIRECTLY REFERENCE** specific skills, technologies, projects, or experiences mentioned in the candidate's CV
2. **MAP TO SPECIFIC JOB REQUIREMENTS** - each question should probe how the candidate's background addresses a concrete requirement from the job posting
3. **USE THE CANDIDATE'S NAME** or reference their specific role/company history when relevant
4. **AVOID GENERIC QUESTIONS** - never ask questions like "Tell me about yourself" or "What are your strengths"
5. **PROBE DEPTH** - ask follow-up style questions that dig into the specifics of what they've done

Question types to include:
- 1-2 questions connecting their SPECIFIC past projects/roles to the job's technical requirements
- 1-2 questions about specific skills from their CV that match the job requirements
- 1 question about a potential gap or growth area based on comparing their CV to job requirements

Return ONLY a JSON array of 5 question strings. No other text, explanation, or markdown formatting.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const userPrompt = `Analyze the following candidate CV and job posting, then generate 5 HIGHLY PERSONALIZED interview questions.

=== JOB POSTING ===
TITLE: ${jobTitle || "Not specified"}

DESCRIPTION: 
${jobDescription || "Not provided"}

KEY REQUIREMENTS:
${jobRequirements || "Not provided"}

=== CANDIDATE CV ===
${cvText || "CV not uploaded - generate questions based on the job requirements, but make them specific to the listed skills and responsibilities"}

=== INSTRUCTIONS ===
Generate exactly 5 interview questions that:
1. Reference SPECIFIC items from the candidate's CV (company names, technologies, project descriptions)
2. Directly connect to SPECIFIC requirements from the job posting
3. Are impossible to answer with generic responses - they must demonstrate real experience
4. Help assess if this specific candidate is a strong match for this specific role

Return ONLY a JSON array of 5 questions.`;

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
          { role: "system", content: systemPrompt },
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

    // Parse the JSON array from the response
    let questions: string[];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by numbered lines
        questions = content
          .split(/\d+\.\s+/)
          .filter((q: string) => q.trim())
          .slice(0, 5)
          .map((q: string) => q.replace(/^["']|["']$/g, "").trim());
      }
    } catch (parseError) {
      console.error("Failed to parse questions:", parseError);
      // Fallback questions
      questions = [
        "Tell us about your most relevant experience for this role.",
        "What interests you most about this position?",
        "Describe a challenging project you've worked on and how you handled it.",
        "How do you approach learning new skills or technologies?",
        "What unique value would you bring to our team?",
      ];
    }

    // Ensure we have exactly 5 questions
    while (questions.length < 5) {
      questions.push("What additional information would you like to share about yourself?");
    }
    questions = questions.slice(0, 5);

    console.log("Generated questions:", questions);

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate questions",
        // Return fallback questions so the user can still proceed
        questions: [
          "Tell us about your most relevant experience for this role.",
          "What interests you most about this position?",
          "Describe a challenging project you've worked on and how you handled it.",
          "How do you approach learning new skills or technologies?",
          "What unique value would you bring to our team?",
        ]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
