import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Eye,
  Users,
  Plus,
  ExternalLink,
  TrendingUp,
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

// Mock data
const kpiData = [
  {
    title: "Links Created",
    value: "12",
    change: "+3 this week",
    icon: Link2,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Total Opens",
    value: "847",
    change: "+12% from last week",
    icon: Eye,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Unique Visitors",
    value: "423",
    change: "+8% from last week",
    icon: Users,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

const jobsData = [
  {
    id: 1,
    title: "Senior Software Engineer",
    company: "Acme Corp",
    created: "2024-01-15",
    status: "Active",
    opens: 234,
    visitors: 156,
  },
  {
    id: 2,
    title: "Product Designer",
    company: "Design Studio",
    created: "2024-01-14",
    status: "Active",
    opens: 189,
    visitors: 98,
  },
  {
    id: 3,
    title: "Marketing Manager",
    company: "Growth Co",
    created: "2024-01-12",
    status: "Active",
    opens: 145,
    visitors: 67,
  },
  {
    id: 4,
    title: "Data Analyst",
    company: "Analytics Inc",
    created: "2024-01-10",
    status: "Active",
    opens: 112,
    visitors: 54,
  },
  {
    id: 5,
    title: "DevOps Engineer",
    company: "Cloud Systems",
    created: "2024-01-08",
    status: "Active",
    opens: 89,
    visitors: 42,
  },
];

const activityData = [
  { day: "Mon", opens: 45 },
  { day: "Tue", opens: 52 },
  { day: "Wed", opens: 78 },
  { day: "Thu", opens: 89 },
  { day: "Fri", opens: 95 },
  { day: "Sat", opens: 34 },
  { day: "Sun", opens: 28 },
];

export default function Dashboard() {
  const maxOpens = Math.max(...activityData.map((d) => d.opens));

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
          {/* Activity Chart */}
          <div className="lg:col-span-1">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold mb-6">Weekly Activity</h2>
              <div className="flex items-end justify-between gap-2 h-40">
                {activityData.map((data) => (
                  <div
                    key={data.day}
                    className="flex flex-col items-center gap-2 flex-1"
                  >
                    <div
                      className="w-full rounded-t-md bg-primary/20 hover:bg-primary/30 transition-colors relative"
                      style={{
                        height: `${(data.opens / maxOpens) * 100}%`,
                        minHeight: "8px",
                      }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-md bg-primary transition-all duration-300"
                        style={{
                          height: `${(data.opens / maxOpens) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {data.day}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Total this week:{" "}
                  <span className="font-semibold text-foreground">
                    {activityData.reduce((sum, d) => sum + d.opens, 0)} opens
                  </span>
                </p>
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
                      <TableHead className="text-right">Opens</TableHead>
                      <TableHead className="text-right">Visitors</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsData.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{job.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.company}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(job.created).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-success/10 text-success border-0"
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {job.opens}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {job.visitors}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
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
