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

  // Calculate real analytics from candidates
  const completedApplications = job.candidates.length;
  const averageScore =
    completedApplications > 0
      ? Math.round(
          job.candidates.reduce((sum, c) => sum + c.score, 0) /
            completedApplications
        )
      : 0;
  const selectedForReview = job.candidates.filter((c) => c.score >= 80).length;

  // Sort candidates by score for top CVs
  const topCandidates = [...job.candidates].sort((a, b) => b.score - a.score);

  const kpiData = [
    {
      title: "Completed Applications",
      value: completedApplications.toString(),
      icon: ClipboardCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Average Candidate Score",
      value: completedApplications > 0 ? `${averageScore}/100` : "N/A",
      icon: Star,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Selected for Review",
      value: selectedForReview.toString(),
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
                {topCandidates.length > 0
                  ? "View the highest-scoring candidate CVs and motivation letters"
                  : "No candidates have applied yet"}
              </p>
            </div>
            {topCandidates.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="gradient">
                    <FileText className="mr-2 h-4 w-4" />
                    View Top CVs
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
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
                          <TableHead className="text-right">
                            Motivation Letter
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCandidates.map((candidate) => (
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
                                  href={candidate.cvUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  CV
                                </a>
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={candidate.motivationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Letter
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
            )}
          </div>

          {/* Quick preview of top 3 candidates */}
          {topCandidates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {topCandidates.slice(0, 3).map((candidate, index) => (
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Waiting for candidates to apply...</p>
              <p className="text-sm mt-1">
                Share the job link to start receiving applications
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
