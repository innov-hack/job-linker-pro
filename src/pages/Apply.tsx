import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle, ArrowRight, Send, Loader2, Sparkles, PartyPopper, Brain, Clock, ChevronRight } from "lucide-react";
import { useJobs, Job } from "@/context/JobsContext";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { Progress } from "@/components/ui/progress";

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
  const { getJob, addCandidate, incrementVisitors, incrementCompleted } = useJobs();

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Timer effect for questions
  useEffect(() => {
    if (step !== "questions") return;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Reset timer for new question
    setTimeLeft(120);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-advance to next question when time runs out
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(idx => idx + 1);
            return 120; // Reset for next question
          } else {
            // Last question - stop timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step, currentQuestionIndex, questions.length]);

  // Go to next question
  function handleNextQuestion() {
    if (!answers[currentQuestionIndex]?.trim()) {
      setError("Please provide an answer before continuing.");
      return;
    }
    setError("");
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(idx => idx + 1);
      setTimeLeft(120); // Reset timer for next question
    }
  }

  // Format time for display
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Upload file to storage
  async function uploadFile(file: File, folder: string): Promise<string> {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('candidate-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload ${file.name}`);
    }

    const { data: urlData } = supabase.storage
      .from('candidate-documents')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  // Evaluate answers using AI
  async function evaluateAnswers(): Promise<number> {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("evaluate-answers", {
        body: {
          questions,
          answers,
          jobTitle: job?.title || "",
          jobDescription,
          jobRequirements,
        },
      });

      if (fnError) {
        console.error("Evaluation error:", fnError);
        return 70; // Default score on error
      }

      console.log("Evaluation result:", data);
      return data?.score || 70;
    } catch (err) {
      console.error("Error evaluating answers:", err);
      return 70;
    }
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
      // Upload files to storage
      let cvUrl = "";
      let motivationUrl = "";

      if (cvFile) {
        cvUrl = await uploadFile(cvFile, "cvs");
      }
      
      if (motivationFile) {
        motivationUrl = await uploadFile(motivationFile, "motivation-letters");
      }

      // Evaluate answers with AI
      const score = await evaluateAnswers();
      console.log("Candidate score:", score);

      await addCandidate(jobId!, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cvFileName: cvFile?.name || "not-uploaded.pdf",
        cvUrl,
        motivationFileName: motivationFile?.name || "not-uploaded.pdf",
        motivationUrl,
        score,
      });
      
      // Increment completed count on successful submission
      await incrementCompleted(jobId!);
      
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
          <>
            {/* Timer Bar - Fixed at top */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-md">
              <div className="max-w-2xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${timeLeft <= 30 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
                    <span className={`font-mono text-lg font-bold ${timeLeft <= 30 ? 'text-destructive' : 'text-foreground'}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                </div>
                <Progress 
                  value={(timeLeft / 120) * 100} 
                  className={`h-2 ${timeLeft <= 30 ? '[&>div]:bg-destructive' : ''}`}
                />
              </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="h-20" />

            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Interview Questions</h2>
              </div>
              
              {/* Question Progress Dots */}
              <div className="flex items-center gap-2 mb-6">
                {questions.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      idx < currentQuestionIndex 
                        ? 'bg-green-500' 
                        : idx === currentQuestionIndex 
                          ? 'bg-primary' 
                          : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Current Question */}
              <div className="min-h-[300px]">
                <Label className="text-base font-medium">
                  {currentQuestionIndex + 1}. {questions[currentQuestionIndex]}
                </Label>
                <Textarea
                  value={answers[currentQuestionIndex] || ""}
                  onChange={(e) => updateAnswer(currentQuestionIndex, e.target.value)}
                  placeholder="Type your answer..."
                  className="mt-3 min-h-[180px] text-base"
                  autoFocus
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm text-center">{error}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-6">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={handleNextQuestion}
                  >
                    Next Question
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
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
                )}
              </div>
            </div>
          </>
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
