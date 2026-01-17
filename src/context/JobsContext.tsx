import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  loading: boolean;
  addJob: (job: Omit<Job, "id" | "created" | "status" | "opens" | "visitors" | "candidates">) => Promise<Job>;
  addCandidate: (jobId: string, candidate: Omit<Candidate, "id" | "score" | "submittedAt">) => Promise<void>;
  incrementVisitors: (jobId: string) => Promise<void>;
  getJob: (jobId: string) => Promise<Job | undefined>;
  deleteJob: (jobId: string) => Promise<void>;
  updateJobStatus: (jobId: string, status: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

// Helper to convert DB row to Job interface
const mapDbJobToJob = (dbJob: any, candidates: any[] = []): Job => ({
  id: dbJob.id,
  title: dbJob.title,
  company: dbJob.company,
  location: dbJob.location,
  link: dbJob.link,
  created: dbJob.created,
  status: dbJob.status,
  opens: dbJob.opens,
  visitors: dbJob.visitors,
  candidates: candidates.map(c => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    cvFileName: c.cv_file_name,
    cvUrl: c.cv_url,
    motivationFileName: c.motivation_file_name,
    motivationUrl: c.motivation_url,
    score: c.score,
    submittedAt: c.submitted_at,
  })),
});

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*');

      if (candidatesError) throw candidatesError;

      const jobsWithCandidates = (jobsData || []).map(job => {
        const jobCandidates = (candidatesData || []).filter(c => c.job_id === job.id);
        return mapDbJobToJob(job, jobCandidates);
      });

      setJobs(jobsWithCandidates);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const addJob = async (jobData: Omit<Job, "id" | "created" | "status" | "opens" | "visitors" | "candidates">): Promise<Job> => {
    const linkId = Math.random().toString(36).substring(2, 10);
    
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        id: linkId,
        title: jobData.title || "Untitled Position",
        company: jobData.company || "Unknown Company",
        location: jobData.location || "Not specified",
        link: `${window.location.origin}/apply/${linkId}`,
        status: "Active",
        opens: 0,
        visitors: 0,
      })
      .select()
      .single();

    if (error) throw error;

    const newJob = mapDbJobToJob(data, []);
    setJobs(prev => [newJob, ...prev]);
    return newJob;
  };

  const addCandidate = async (jobId: string, candidateData: Omit<Candidate, "id" | "score" | "submittedAt">) => {
    const candidateId = Math.random().toString(36).substring(2, 10);
    
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        id: candidateId,
        job_id: jobId,
        first_name: candidateData.firstName,
        last_name: candidateData.lastName,
        cv_file_name: candidateData.cvFileName,
        cv_url: candidateData.cvUrl,
        motivation_file_name: candidateData.motivationFileName,
        motivation_url: candidateData.motivationUrl,
        score: Math.floor(Math.random() * 30) + 70,
      })
      .select()
      .single();

    if (error) throw error;

    const newCandidate: Candidate = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      cvFileName: data.cv_file_name,
      cvUrl: data.cv_url,
      motivationFileName: data.motivation_file_name,
      motivationUrl: data.motivation_url,
      score: data.score,
      submittedAt: data.submitted_at,
    };

    setJobs(prev =>
      prev.map(job =>
        job.id === jobId
          ? { ...job, candidates: [...job.candidates, newCandidate] }
          : job
      )
    );
  };

  const incrementVisitors = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const { error } = await supabase
      .from('jobs')
      .update({ 
        visitors: job.visitors + 1, 
        opens: job.opens + 1 
      })
      .eq('id', jobId);

    if (error) {
      console.error("Failed to increment visitors:", error);
      return;
    }

    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, visitors: j.visitors + 1, opens: j.opens + 1 }
          : j
      )
    );
  };

  const getJob = async (jobId: string): Promise<Job | undefined> => {
    // First check local state
    const localJob = jobs.find(job => job.id === jobId);
    if (localJob) return localJob;

    // If not in local state, fetch from database
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !jobData) return undefined;

    const { data: candidatesData } = await supabase
      .from('candidates')
      .select('*')
      .eq('job_id', jobId);

    return mapDbJobToJob(jobData, candidatesData || []);
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error("Failed to delete job:", error);
      return;
    }

    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId);

    if (error) {
      console.error("Failed to update job status:", error);
      return;
    }

    setJobs(prev =>
      prev.map(job =>
        job.id === jobId ? { ...job, status } : job
      )
    );
  };

  const refreshJobs = async () => {
    setLoading(true);
    await fetchJobs();
  };

  return (
    <JobsContext.Provider value={{ 
      jobs, 
      loading, 
      addJob, 
      addCandidate, 
      incrementVisitors, 
      getJob, 
      deleteJob, 
      updateJobStatus,
      refreshJobs 
    }}>
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
