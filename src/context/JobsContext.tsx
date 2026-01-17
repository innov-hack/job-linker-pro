import { createContext, useContext, useState, ReactNode } from "react";

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
}

interface JobsContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "created" | "status" | "opens" | "visitors">) => Job;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

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
  },
];

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  const addJob = (jobData: Omit<Job, "id" | "created" | "status" | "opens" | "visitors">): Job => {
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
    };
    
    setJobs((prev) => [newJob, ...prev]);
    return newJob;
  };

  return (
    <JobsContext.Provider value={{ jobs, addJob }}>
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
