import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle, ArrowRight, Send, Loader2, Sparkles, PartyPopper, Brain } from "lucide-react";
import { useJobs, Job } from "@/context/JobsContext";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

type Step = "loading" | "upload" | "generating" | "questions" | "complete" | "notfound";

// Simple PDF text extraction (extracts readable text from PDF)
async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string and try to extract text content
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = decoder.decode(uint8Array);
    
    // Extract text between stream and endstream (PDF text objects)
    const streamMatches = rawText.match(/stream[\s\S]*?endstream/g);
    if (streamMatches) {
      for (const match of streamMatches) {
        // Look for text in parentheses (PDF text strings)
        const textMatches = match.match(/\(([^)]+)\)/g);
        if (textMatches) {
          for (const tm of textMatches) {
            const extracted = tm.slice(1, -1);
            if (extracted.length > 2 && /[a-zA-Z]/.test(extracted)) {
              text += extracted + " ";
            }
          }
        }
      }
    }
    
    // Clean up the text
    text = text.replace(/\s+/g, " ").trim();
    
    // If we got some text, return it (limited to first 3000 chars for API)
    if (text.length > 50) {
      return text.substring(0, 3000);
    }
    
    // Fallback: just return file info
    return `CV uploaded: ${file.name} (${Math.round(file.size / 1024)}KB)`;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return `CV uploaded: ${file.name}`;
  }
}

export default function Apply() {
  const { jobId } = useParams<{ jobId: string }>();
  const { getJob, addCandidate, incrementVisitors } = useJobs();

  const [step, setStep] = useState<Step>("loading");
  const [job, setJob] = useState<Job | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [jobRequirements, setJobRequirements] = useState<string>("");
  
  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  
  // UI state
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load job on mount
  useEffect(() => {
    if (!jobId) {
      setStep("notfound");
      return;
    }

    // Fetch job with description and requirements from database
    async function fetchJobData() {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (jobError || !jobData) {
          setStep("notfound");
          return;
        }

        const foundJob = await getJob(jobId);
        if (foundJob) {
          setJob(foundJob);
          setJobDescription(jobData.description || "");
          setJobRequirements(jobData.requirements || "");
          setStep("upload");
          incrementVisitors(jobId);
        } else {
          setStep("notfound");
        }
      } catch (err) {
        console.error("Error fetching job:", err);
        setStep("notfound");
      }
    }

    fetchJobData();
  }, [jobId]);

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
    }, 200);
  }, []);

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: "cv" | "motivation") {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    
    setError("");
    if (type === "cv") {
      setCvFile(file);
    } else {
      setMotivationFile(file);
    }
  }

  // Generate questions using AI
  async function generateQuestions(): Promise<void> {
    setStep("generating");
    setError("");

    try {
      // Extract text from CV if uploaded
      let cvText = "";
      if (cvFile) {
        cvText = await extractTextFromPdf(cvFile);
      }

      console.log("Calling generate-questions edge function...");

      const { data, error: fnError } = await supabase.functions.invoke("generate-questions", {
        body: {
          cvText,
          jobTitle: job?.title || "",
          jobDescription: jobDescription,
          jobRequirements: jobRequirements,
        },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message);
      }

      console.log("Generated questions response:", data);

      if (data?.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setAnswers(data.questions.map(() => ""));
        setStep("questions");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error generating questions:", err);
      // Use fallback questions
      const fallbackQuestions = [
        "Tell us about your most relevant experience for this role.",
        "What interests you most about this position?",
        "Describe a challenging project you've worked on and how you handled it.",
        "How do you approach learning new skills or technologies?",
        "What unique value would you bring to our team?",
      ];
      setQuestions(fallbackQuestions);
      setAnswers(fallbackQuestions.map(() => ""));
      setStep("questions");
    }
  }

  // Go to questions step
  async function handleContinue() {
    const first = firstName.trim();
    const last = lastName.trim();
    
    if (!first || !last) {
      setError("Please enter your first and last name.");
      return;
    }
    
    setError("");
    await generateQuestions();
  }

  // Update answer
  function updateAnswer(index: number, value: string) {
    setAnswers(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  // Submit application
  async function handleSubmit() {
    const hasEmptyAnswer = answers.some(a => !a.trim());
    if (hasEmptyAnswer) {
      setError("Please answer all questions.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await addCandidate(jobId!, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cvFileName: cvFile?.name || "not-uploaded.pdf",
        cvUrl: cvFile ? URL.createObjectURL(cvFile) : "",
        motivationFileName: motivationFile?.name || "not-uploaded.pdf",
        motivationUrl: motivationFile ? URL.createObjectURL(motivationFile) : "",
      });
      
      fireConfetti();
      setStep("complete");
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // LOADING STATE
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // NOT FOUND STATE
  if (step === "notfound") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Job Not Found</h1>
          <p className="mt-2 text-muted-foreground">This job posting doesn't exist.</p>
        </div>
      </div>
    );
  }

  // GENERATING QUESTIONS STATE
  if (step === "generating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="relative mb-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <Sparkles className="absolute top-0 right-1/3 h-5 w-5 text-amber-400 animate-bounce" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Generating Your Interview Questions</h2>
          <p className="text-muted-foreground mb-4">
            Our AI is creating personalized questions based on your CV and the job requirements...
          </p>
          <div className="flex justify-center gap-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{job?.title}</h1>
          <p className="mt-2 text-muted-foreground">{job?.company} • {job?.location}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step === "upload" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          }`}>1</div>
          <div className="h-1 w-8 bg-muted rounded" />
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step === "questions" ? "bg-primary text-primary-foreground" : 
            step === "complete" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}>2</div>
          <div className="h-1 w-8 bg-muted rounded" />
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step === "complete" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
          }`}>✓</div>
        </div>

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Upload Your Documents</h2>

            {/* Name Fields */}
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* CV Upload */}
            <div className="mb-4">
              <Label>CV / Resume (PDF) - Optional but recommended</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload your CV to receive personalized interview questions
              </p>
              <label className="mt-1 flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                {cvFile ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm">{cvFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Click to upload CV</span>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "cv")}
                />
              </label>
            </div>

            {/* Motivation Letter Upload */}
            <div className="mb-6">
              <Label>Motivation Letter (PDF) - Optional</Label>
              <label className="mt-1 flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                {motivationFile ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm">{motivationFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Click to upload motivation letter</span>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "motivation")}
                />
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm text-center">{error}</p>
              </div>
            )}

            {/* Continue Button */}
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={handleContinue}
            >
              Continue to Questions
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* QUESTIONS STEP */}
        {step === "questions" && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Interview Questions</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              These questions were generated based on your profile and the job requirements.
            </p>

            <div className="space-y-6">
              {questions.map((question, idx) => (
                <div key={idx}>
                  <Label className="text-base">{idx + 1}. {question}</Label>
                  <Textarea
                    value={answers[idx] || ""}
                    onChange={(e) => updateAnswer(idx, e.target.value)}
                    placeholder="Type your answer..."
                    className="mt-2 min-h-[100px]"
                  />
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="button"
              className="w-full mt-6"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === "complete" && (
          <div className="bg-card rounded-xl border p-8 shadow-sm text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400" />
                <PartyPopper className="absolute -bottom-1 -left-2 h-5 w-5 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Application Submitted! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying to <span className="font-semibold">{job?.title}</span> at{" "}
              <span className="font-semibold">{job?.company}</span>.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                What's next?
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Our team will review your application</li>
                <li>• We'll contact you if there's a match</li>
                <li>• Check your email for updates</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
