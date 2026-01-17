import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  cvFileName: string;
  cvUrl: string;
  motivationFileName: string;
  motivationUrl: string;
  score: number;
  submittedAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  created: string;
  status: string;
  opens: number;
  visitors: number;
  candidates: Candidate[];
}

interface JobsContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "created" | "status" | "opens" | "visitors" | "candidates">) => Job;
  addCandidate: (jobId: string, candidate: Omit<Candidate, "id" | "score" | "submittedAt">) => void;
  incrementVisitors: (jobId: string) => void;
  getJob: (jobId: string) => Job | undefined;
  deleteJob: (jobId: string) => void;
  updateJobStatus: (jobId: string, status: string) => void;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

const STORAGE_KEY = "linkrecruit_jobs";

// Initial sample data
const initialJobs: Job[] = [
  {
    id: "sample-1",
    title: "Senior Software Engineer",
    company: "Acme Corp",
    location: "San Francisco, CA",
    link: "https://linkrecruit.app/job/sample1",
    created: "2024-01-15",
    status: "Active",
    opens: 234,
    visitors: 156,
    candidates: [
      {
        id: "c1",
        firstName: "Sarah",
        lastName: "Johnson",
        cvFileName: "sarah-johnson-cv.pdf",
        cvUrl: "https://example.com/cv/sarah-johnson.pdf",
        motivationFileName: "sarah-johnson-motivation.pdf",
        motivationUrl: "https://example.com/motivation/sarah-johnson.pdf",
        score: 95,
        submittedAt: "2024-01-16",
      },
      {
        id: "c2",
        firstName: "Michael",
        lastName: "Chen",
        cvFileName: "michael-chen-cv.pdf",
        cvUrl: "https://example.com/cv/michael-chen.pdf",
        motivationFileName: "michael-chen-motivation.pdf",
        motivationUrl: "https://example.com/motivation/michael-chen.pdf",
        score: 92,
        submittedAt: "2024-01-16",
      },
    ],
  },
  {
    id: "sample-2",
    title: "Product Designer",
    company: "Design Studio",
    location: "Remote",
    link: "https://linkrecruit.app/job/sample2",
    created: "2024-01-14",
    status: "Active",
    opens: 189,
    visitors: 98,
    candidates: [],
  },
  {
    id: "sample-3",
    title: "Marketing Manager",
    company: "Growth Co",
    location: "New York, NY",
    link: "https://linkrecruit.app/job/sample3",
    created: "2024-01-12",
    status: "Active",
    opens: 145,
    visitors: 67,
    candidates: [],
  },
];

// Load jobs from localStorage or use initial data
const loadJobsFromStorage = (): Job[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load jobs from storage:", error);
  }
  return initialJobs;
};

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(loadJobsFromStorage);

  // Persist jobs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch (error) {
      console.error("Failed to save jobs to storage:", error);
    }
  }, [jobs]);

  const addJob = (jobData: Omit<Job, "id" | "created" | "status" | "opens" | "visitors" | "candidates">): Job => {
    const linkId = Math.random().toString(36).substring(2, 10);
    const newJob: Job = {
      id: linkId,
      title: jobData.title || "Untitled Position",
      company: jobData.company || "Unknown Company",
      location: jobData.location || "Not specified",
      link: `https://linkrecruit.app/job/${linkId}`,
      created: new Date().toISOString().split("T")[0],
      status: "Active",
      opens: 0,
      visitors: 0,
      candidates: [],
    };
    
    setJobs((prev) => [newJob, ...prev]);
    return newJob;
  };

  const addCandidate = (jobId: string, candidateData: Omit<Candidate, "id" | "score" | "submittedAt">) => {
    const newCandidate: Candidate = {
      id: Math.random().toString(36).substring(2, 10),
      ...candidateData,
      score: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      submittedAt: new Date().toISOString().split("T")[0],
    };

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, candidates: [...job.candidates, newCandidate] }
          : job
      )
    );
  };

  const incrementVisitors = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, visitors: job.visitors + 1, opens: job.opens + 1 }
          : job
      )
    );
  };

  const getJob = (jobId: string) => {
    return jobs.find((job) => job.id === jobId);
  };

  const deleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  };

  const updateJobStatus = (jobId: string, status: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status } : job
      )
    );
  };

  return (
    <JobsContext.Provider value={{ jobs, addJob, addCandidate, incrementVisitors, getJob, deleteJob, updateJobStatus }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (context === undefined) {
    throw new Error("useJobs must be used within a JobsProvider");
  }
  return context;
}
