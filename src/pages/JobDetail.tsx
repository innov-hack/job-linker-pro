import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ClipboardCheck,
  Star,
  UserCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useJobs } from "@/context/JobsContext";

// Mock candidate data for demonstration
const mockCandidates = [
  {
    id: "1",
    firstName: "Sarah",
    lastName: "Johnson",
    cvLink: "https://example.com/cv/sarah-johnson.pdf",
    score: 95,
  },
  {
    id: "2",
    firstName: "Michael",
    lastName: "Chen",
    cvLink: "https://example.com/cv/michael-chen.pdf",
    score: 92,
  },
  {
    id: "3",
    firstName: "Emily",
    lastName: "Rodriguez",
    cvLink: "https://example.com/cv/emily-rodriguez.pdf",
    score: 89,
  },
  {
    id: "4",
    firstName: "David",
    lastName: "Kim",
    cvLink: "https://example.com/cv/david-kim.pdf",
    score: 87,
  },
  {
    id: "5",
    firstName: "Lisa",
    lastName: "Thompson",
    cvLink: "https://example.com/cv/lisa-thompson.pdf",
    score: 85,
  },
];

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const { jobs } = useJobs();

  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <div className="min-h-screen py-12 sm:py-16">
        <div className="container-page">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Job Not Found</h1>
            <p className="mt-2 text-muted-foreground">
              The job you're looking for doesn't exist.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mock analytics data (placeholder values)
  const analytics = {
    completedApplications: 24,
    averageScore: 78,
    selectedForReview: 8,
  };

  const kpiData = [
    {
      title: "Completed Applications",
      value: analytics.completedApplications.toString(),
      icon: ClipboardCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Average Candidate Score",
      value: `${analytics.averageScore}/100`,
      icon: Star,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Selected for Review",
      value: analytics.selectedForReview.toString(),
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-page">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        {/* Job Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{job.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {job.company} • {job.location}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Created on{" "}
            {new Date(job.created).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Sample Data Banner */}
        <div className="mb-8 rounded-xl bg-muted/50 border border-border p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Sample Data:</strong> The data shown below is placeholder
            data for demonstration purposes.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 sm:grid-cols-3 mb-8">
          {kpiData.map((kpi) => (
            <div key={kpi.title} className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${kpi.bgColor}`}
                >
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top CVs Section */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Top Candidates</h2>
              <p className="text-sm text-muted-foreground">
                View the highest-scoring candidate CVs
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <FileText className="mr-2 h-4 w-4" />
                  View Top CVs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Top Candidate CVs</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">CV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockCandidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">
                            {candidate.firstName}
                          </TableCell>
                          <TableCell>{candidate.lastName}</TableCell>
                          <TableCell className="text-right">
                            {candidate.score}/100
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={candidate.cvLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View PDF
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick preview of top 3 candidates */}
          <div className="grid gap-4 sm:grid-cols-3">
            {mockCandidates.slice(0, 3).map((candidate, index) => (
              <div
                key={candidate.id}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Score: {candidate.score}/100
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
