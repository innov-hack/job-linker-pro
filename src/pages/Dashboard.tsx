import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Eye,
  Users,
  Plus,
  ExternalLink,
  TrendingUp,
  Trash2,
  StopCircle,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/context/JobsContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const weeklyData = [
  { day: "Mon", completed: 42, visitors: 68 },
  { day: "Tue", completed: 58, visitors: 89 },
  { day: "Wed", completed: 73, visitors: 112 },
  { day: "Thu", completed: 51, visitors: 95 },
  { day: "Fri", completed: 64, visitors: 103 },
  { day: "Sat", completed: 28, visitors: 45 },
  { day: "Sun", completed: 19, visitors: 32 },
];

export default function Dashboard() {
  const { jobs, loading, deleteJob, updateJobStatus } = useJobs();
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  
  const maxValue = Math.max(...weeklyData.map(d => Math.max(d.completed, d.visitors)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate KPIs from jobs data
  const totalOpens = jobs.reduce((sum, job) => sum + job.opens, 0);
  const totalVisitors = jobs.reduce((sum, job) => sum + job.visitors, 0);

  const kpiData = [
    {
      title: "Links Created",
      value: jobs.length.toString(),
      change: "+1 this week",
      icon: Link2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Completed",
      value: totalOpens.toString(),
      change: "+12% from last week",
      icon: Eye,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Unique Visitors",
      value: totalVisitors.toString(),
      change: "+8% from last week",
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              Track your job posting performance and engagement
            </p>
          </div>
          <Button asChild variant="gradient">
            <Link to="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Job Link
            </Link>
          </Button>
        </div>

        {/* Sample Data Banner */}
        <div className="mb-8 rounded-xl bg-muted/50 border border-border p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Sample Data:</strong> The data shown below is placeholder
            data for demonstration purposes. Connect to a backend service to
            see real analytics.
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
                  <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    {kpi.change}
                  </p>
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Activity Chart - New Design */}
          <div className="lg:col-span-1">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Weekly Activity</h2>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <span className="text-muted-foreground">Visitors</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {weeklyData.map((data) => (
                  <div key={data.day} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium w-8">{data.day}</span>
                      <span className="text-xs text-muted-foreground">
                        {data.completed} / {data.visitors}
                      </span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div
                        className="h-full rounded-md bg-primary transition-all duration-300 hover:opacity-80"
                        style={{ width: `${(data.completed / maxValue) * 100}%` }}
                      />
                      <div
                        className="h-full rounded-md bg-accent transition-all duration-300 hover:opacity-80"
                        style={{ width: `${(data.visitors / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Total Completed</p>
                  <p className="font-bold text-lg">{weeklyData.reduce((sum, d) => sum + d.completed, 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Total Visitors</p>
                  <p className="font-bold text-lg">{weeklyData.reduce((sum, d) => sum + d.visitors, 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="lg:col-span-2">
            <div className="card-elevated overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold">Recent Job Links</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Visitors</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link to={`/job/${job.id}`} className="block hover:opacity-80 transition-opacity">
                            <p className="font-medium text-primary hover:underline">{job.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.company}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(job.created).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge
                                variant="secondary"
                                className={`cursor-pointer ${
                                  job.status === "Active" 
                                    ? "bg-success/10 text-success border-0 hover:bg-success/20" 
                                    : "bg-destructive/10 text-destructive border-0 hover:bg-destructive/20"
                                }`}
                              >
                                {job.status}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateJobStatus(job.id, "Active")}>
                                Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateJobStatus(job.id, "Terminated")}>
                                <StopCircle className="mr-2 h-4 w-4" />
                                Terminated
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {job.opens}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {job.visitors}
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={job.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <AlertDialog open={jobToDelete === job.id} onOpenChange={(open) => !open && setJobToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setJobToDelete(job.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{job.title}"? This action cannot be undone and all candidate data will be lost.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    deleteJob(job.id);
                                    setJobToDelete(null);
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
