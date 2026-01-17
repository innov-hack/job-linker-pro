import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, BarChart3, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Interviews",
    description: "Automatically generate personalized interview questions tailored to each job's specific requirements and responsibilities.",
  },
  {
    icon: BarChart3,
    title: "Smart Candidate Scoring",
    description: "AI evaluates candidate responses based on relevance, depth, and alignment with your job requirements—instantly.",
  },
  {
    icon: Sparkles,
    title: "Effortless Setup",
    description: "Upload your job description, share a link, and let Talently handle the screening while you focus on top candidates.",
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
              Hire Smarter with{" "}
              <span className="gradient-text">Talently</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              The AI-powered hiring assistant that generates personalized interview questions 
              based on your job description, then evaluates candidate responses to identify 
              the best fit for your role—automatically.
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
              AI-driven candidate screening, simplified
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Let Talently handle the initial screening so you can focus on the candidates who truly match your needs.
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
              Ready to find your perfect candidates?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start screening smarter with AI-powered interviews. No credit card required.
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
