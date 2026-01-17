import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link2, BarChart3, Zap } from "lucide-react";

const features = [
  {
    icon: Link2,
    title: "Smart Job Links",
    description: "Generate unique links for each job posting that track engagement automatically.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Monitor link opens, visitor counts, and engagement metrics in one dashboard.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Upload your job description and get a shareable link in seconds.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient py-24 sm:py-32">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center animate-slide-up">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Share Jobs with{" "}
              <span className="gradient-text">Smart Links</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Create trackable job posting links in seconds. Upload your job description,
              generate a unique link, and monitor candidate engagement—all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="xl" variant="gradient">
                <Link to="/create">
                  Create Job Link
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to recruit smarter
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Streamline your hiring process with powerful link tracking and analytics.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-elevated p-8 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-secondary/50">
        <div className="container-page">
          <div className="card-elevated mx-auto max-w-4xl p-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to streamline your hiring?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start creating trackable job links today. No credit card required.
            </p>
            <Button asChild size="lg" className="mt-8" variant="gradient">
              <Link to="/create">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
