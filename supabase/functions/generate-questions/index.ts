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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a senior talent acquisition specialist creating highly personalized interview questions.

CRITICAL INSTRUCTIONS FOR CV PARSING:
- Read the CV text VERY CAREFULLY, character by character
- Company names, technologies, and skills must be extracted EXACTLY as written
- DO NOT invent, guess, or hallucinate any company names, projects, or technologies
- If something is unclear in the CV, do NOT reference it - only mention things you can clearly read
- Pay special attention to proper nouns - copy them exactly as they appear

Your task is to generate exactly 5 deeply personalized interview questions that:

1. **DIRECTLY REFERENCE** specific and VERIFIED skills, technologies, projects, or experiences from the candidate's CV
2. **MAP TO SPECIFIC JOB REQUIREMENTS** - each question should probe how the candidate's background addresses a concrete requirement
3. **AVOID GENERIC QUESTIONS** - never ask "Tell me about yourself" or "What are your strengths"
4. **PROBE DEPTH** - ask follow-up style questions that dig into specifics

Question types to include:
- 2 questions connecting their SPECIFIC past projects/roles to the job's technical requirements
- 2 questions about specific skills from their CV that match the job requirements  
- 1 question about a potential gap or growth area

IMPORTANT: Only reference companies, projects, technologies, and skills that are EXPLICITLY written in the CV. If you cannot clearly read something, do not mention it.

Return ONLY a JSON array of 5 question strings. No other text, explanation, or markdown formatting.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const userPrompt = `Analyze the following candidate CV and job posting, then generate 5 HIGHLY PERSONALIZED interview questions.

CRITICAL: Read the CV text below VERY CAREFULLY. Extract company names, technologies, and skills EXACTLY as written. Do NOT invent or guess any information.

=== JOB POSTING ===
TITLE: ${jobTitle || "Not specified"}

DESCRIPTION: 
${jobDescription || "Not provided"}

KEY REQUIREMENTS:
${jobRequirements || "Not provided"}

=== CANDIDATE CV (READ CAREFULLY - EXTRACT EXACT TEXT) ===
${cvText || "CV not provided - generate questions based only on the job requirements"}

=== INSTRUCTIONS ===
1. First, carefully read and extract the EXACT company names, technologies, and skills from the CV
2. Generate questions that reference ONLY what is explicitly written in the CV
3. Do NOT make up or guess any company names, projects, or technologies
4. If the CV text is unclear or hard to parse, focus on job requirements instead

Return ONLY a JSON array of 5 questions.`;

    console.log("Generating questions with Lovable AI (Gemini)...");
    console.log("CV Text length:", cvText?.length || 0);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
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
      // Fallback questions based on job requirements
      questions = [
        `Based on the requirements for ${jobTitle || "this role"}, describe a relevant project you've worked on.`,
        "What specific technical skills from your experience make you a strong fit for this position?",
        "Describe a challenging problem you solved in your previous role and the approach you took.",
        "How do you stay current with industry developments and continue learning?",
        "What aspects of this role are you most excited about and why?",
      ];
    }

    // Ensure we have exactly 5 questions
    while (questions.length < 5) {
      questions.push("What additional relevant experience would you like to highlight for this role?");
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
          "Describe a relevant project from your experience that relates to this role.",
          "What specific skills make you a strong candidate for this position?",
          "Tell us about a challenging problem you solved and how you approached it.",
          "How do you approach learning new technologies or skills?",
          "What interests you most about this opportunity?",
        ]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
