-- Create jobs table
CREATE TABLE public.jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  link TEXT NOT NULL,
  created DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  opens INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  cv_file_name TEXT NOT NULL,
  cv_url TEXT NOT NULL,
  motivation_file_name TEXT NOT NULL,
  motivation_url TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  submitted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (no auth required for this app)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access to jobs (since this is a demo without auth)
CREATE POLICY "Allow public read access to jobs" 
  ON public.jobs FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access to jobs" 
  ON public.jobs FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access to jobs" 
  ON public.jobs FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public delete access to jobs" 
  ON public.jobs FOR DELETE 
  USING (true);

-- Allow public read/write access to candidates
CREATE POLICY "Allow public read access to candidates" 
  ON public.candidates FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert access to candidates" 
  ON public.candidates FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access to candidates" 
  ON public.candidates FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public delete access to candidates" 
  ON public.candidates FOR DELETE 
  USING (true);

-- Insert sample data
INSERT INTO public.jobs (id, title, company, location, link, created, status, opens, visitors) VALUES
  ('sample-1', 'Senior Software Engineer', 'Acme Corp', 'San Francisco, CA', 'https://linkrecruit.app/job/sample-1', '2024-01-15', 'Active', 234, 156),
  ('sample-2', 'Product Designer', 'Design Studio', 'Remote', 'https://linkrecruit.app/job/sample-2', '2024-01-14', 'Active', 189, 98),
  ('sample-3', 'Marketing Manager', 'Growth Co', 'New York, NY', 'https://linkrecruit.app/job/sample-3', '2024-01-12', 'Active', 145, 67);

INSERT INTO public.candidates (id, job_id, first_name, last_name, cv_file_name, cv_url, motivation_file_name, motivation_url, score, submitted_at) VALUES
  ('c1', 'sample-1', 'Sarah', 'Johnson', 'sarah-johnson-cv.pdf', 'https://example.com/cv/sarah-johnson.pdf', 'sarah-johnson-motivation.pdf', 'https://example.com/motivation/sarah-johnson.pdf', 95, '2024-01-16'),
  ('c2', 'sample-1', 'Michael', 'Chen', 'michael-chen-cv.pdf', 'https://example.com/cv/michael-chen.pdf', 'michael-chen-motivation.pdf', 'https://example.com/motivation/michael-chen.pdf', 92, '2024-01-16');