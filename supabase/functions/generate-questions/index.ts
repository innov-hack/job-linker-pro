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

    const systemPrompt = `You are an expert HR interviewer who creates thoughtful, relevant interview questions. 
Your task is to generate exactly 5 open-ended interview questions that:
1. Are specific to the candidate's CV/resume and the job they're applying for
2. Help assess the candidate's fit for the role
3. Are professional and insightful
4. Encourage detailed, meaningful responses

Return ONLY a JSON array of 5 question strings. No other text or explanation.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const userPrompt = `Generate 5 interview questions for this candidate and job:

JOB TITLE: ${jobTitle || "Not specified"}

JOB DESCRIPTION: ${jobDescription || "Not provided"}

JOB REQUIREMENTS: ${jobRequirements || "Not provided"}

CANDIDATE CV CONTENT: ${cvText || "CV not uploaded - generate general questions based on the job description"}

Generate exactly 5 relevant, open-ended interview questions.`;

    console.log("Generating questions with Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
