import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle, ArrowRight, Send, Loader2, Sparkles, PartyPopper } from "lucide-react";
import { useJobs, Job } from "@/context/JobsContext";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

// Placeholder questions
const placeholderQuestions = [
  "Tell us about your most challenging project and how you overcame the obstacles.",
  "What motivates you to apply for this position?",
  "Describe a situation where you had to work with a difficult team member. How did you handle it?",
  "Where do you see yourself professionally in the next 5 years?",
  "What unique skills or perspectives would you bring to our team?",
];

export default function Apply() {
  const { jobId } = useParams<{ jobId: string }>();
  const { getJob, addCandidate, incrementVisitors } = useJobs();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(0); // 0=loading, 1=upload, 2=questions, 3=complete, -1=not-found
  const [job, setJob] = useState<Job | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']
    });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#6366f1', '#8b5cf6', '#a855f7'] });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#d946ef', '#ec4899', '#f43f5e'] });
    }, 200);
    setTimeout(() => {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5, x: 0.5 }, colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#fbbf24'] });
    }, 400);
  }, []);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        setCurrentStep(-1);
        return;
      }
      try {
        const fetchedJob = await getJob(jobId);
        if (fetchedJob) {
          setJob(fetchedJob);
          setCurrentStep(1);
          incrementVisitors(jobId);
        } else {
          setCurrentStep(-1);
        }
      } catch (error) {
        console.error("Failed to load job:", error);
        setCurrentStep(-1);
      }
    };
    loadJob();
  }, [jobId, getJob, incrementVisitors]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "cv" | "motivation") => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      if (type === "cv") setCvFile(file);
      else setMotivationFile(file);
    } else if (file) {
      toast({ title: "Invalid file type", description: "Please upload a PDF file.", variant: "destructive" });
    }
  };

  const goToQuestions = () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name to continue.");
      return;
    }
    setCurrentStep(2);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const submitApplication = async () => {
    const unanswered = answers.some((a) => !a.trim());
    if (unanswered) {
      toast({ title: "Incomplete responses", description: "Please answer all questions before submitting.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addCandidate(jobId!, {
        firstName,
        lastName,
        cvFileName: cvFile?.name || "not-uploaded.pdf",
        cvUrl: cvFile ? URL.createObjectURL(cvFile) : "",
        motivationFileName: motivationFile?.name || "not-uploaded.pdf",
        motivationUrl: motivationFile ? URL.createObjectURL(motivationFile) : "",
      });
      fireConfetti();
      setCurrentStep(3);
    } catch (error) {
      console.error("Failed to submit:", error);
      toast({ title: "Submission failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (currentStep === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (currentStep === -1 || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Job Not Found</h1>
          <p className="mt-2 text-muted-foreground">This job posting doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 sm:py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container-page max-w-2xl">
        {/* Job Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
          <p className="mt-2 text-muted-foreground">{job.company} • {job.location}</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${currentStep === 1 ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>1</div>
            <div className="h-1 w-8 rounded bg-muted" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${currentStep === 2 ? "bg-primary text-primary-foreground" : currentStep === 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>2</div>
            <div className="h-1 w-8 rounded bg-muted" />
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${currentStep === 3 ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>✓</div>
          </div>
        </div>

        {/* Step 1: Upload Documents */}
        {currentStep === 1 && (
          <div className="card-elevated p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-6">Upload Your Documents</h2>

            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter your first name" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter your last name" className="mt-1.5" />
              </div>
            </div>

            <div className="mb-6">
              <Label>CV / Resume (PDF) - Optional</Label>
              <div className="mt-1.5">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {cvFile ? (
                      <>
                        <FileText className="h-8 w-8 text-primary mb-2" />
                        <p className="text-sm font-medium">{cvFile.name}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload your CV</p>
                      </>
                    )}
                  </div>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, "cv")} />
                </label>
              </div>
            </div>

            <div className="mb-8">
              <Label>Motivation Letter (PDF) - Optional</Label>
              <div className="mt-1.5">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {motivationFile ? (
                      <>
                        <FileText className="h-8 w-8 text-primary mb-2" />
                        <p className="text-sm font-medium">{motivationFile.name}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload your motivation letter</p>
                      </>
                    )}
                  </div>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, "motivation")} />
                </label>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive font-medium text-center">{error}</p>
              </div>
            )}

            <Button type="button" variant="gradient" size="xl" className="w-full" onClick={goToQuestions}>
              Continue to Questions
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 2: Answer Questions */}
        {currentStep === 2 && (
          <div className="card-elevated p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-2">Interview Questions</h2>
            <p className="text-sm text-muted-foreground mb-6">Please answer the following questions thoughtfully.</p>

            <div className="space-y-6">
              {placeholderQuestions.map((question, index) => (
                <div key={index}>
                  <Label className="text-base">{index + 1}. {question}</Label>
                  <Textarea value={answers[index]} onChange={(e) => handleAnswerChange(index, e.target.value)} placeholder="Type your answer here..." className="mt-2 min-h-[100px]" />
                </div>
              ))}
            </div>

            <Button variant="gradient" size="xl" className="w-full mt-8" onClick={submitApplication} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <Send className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <div className="card-elevated p-8 sm:p-12 text-center animate-scale-in overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-success to-emerald-400 shadow-lg shadow-success/30 animate-fade-in">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <Sparkles className="h-8 w-8 text-amber-400" />
                  </div>
                  <div className="absolute -bottom-1 -left-3 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    <PartyPopper className="h-7 w-7 text-primary" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
                  Welcome to the Team! 🎉
                </h2>
                <p className="text-xl text-foreground font-medium animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  Well, almost... Your application is in!
                </p>
              </div>

              <div className="bg-muted/50 rounded-2xl p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <p className="text-muted-foreground leading-relaxed">
                  We're thrilled to have received your application for <span className="font-semibold text-foreground">{job.title}</span> at <span className="font-semibold text-foreground">{job.company}</span>. 
                  Your responses have been carefully saved, and our team is excited to review your profile.
                </p>
              </div>

              <div className="text-left bg-primary/5 rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  What happens next?
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">1.</span>
                    Our hiring team will review your application within 3-5 business days
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">2.</span>
                    If your profile matches our requirements, we'll reach out for the next steps
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">3.</span>
                    Keep an eye on your inbox for updates from us!
                  </li>
                </ul>
              </div>

              <p className="mt-8 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.8s' }}>
                Thank you for taking the time to complete our application process. We appreciate your interest! ✨
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}