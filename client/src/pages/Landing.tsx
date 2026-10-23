import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Cohort } from "@shared/schema";
import { formatCohortDate } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Lightbulb, 
  Users, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Star,
  ArrowRight,
  Play,
  Award,
  User
} from "lucide-react";

export default function Landing() {
  // Public endpoint: active cohorts open to applicants
  const { data: openCohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });
  const nextCohort = [...openCohorts].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )[0];

  // Stats will be populated with real data when available
  const stats: any[] = [];

  const features = [
    {
      icon: Lightbulb,
      title: "AI-First Curriculum",
      description: "Comprehensive 8-week program covering AI/ML fundamentals, business strategy, and startup essentials."
    },
    {
      icon: Users,
      title: "Expert Mentorship",
      description: "1:1 guidance from industry leaders, successful entrepreneurs, and AI experts."
    },
    {
      icon: TrendingUp,
      title: "Investor Network",
      description: "Direct access to VCs and angel investors actively seeking AI startups."
    },
    {
      icon: Calendar,
      title: "Demo Day",
      description: "Pitch your startup to top investors at our exclusive Demo Day events."
    },
  ];

  // Alumni testimonials will be populated with real testimonials when available
  const testimonials: any[] = [];

  const cohortTimeline = [
    { week: "1-2", title: "Foundation", description: "AI fundamentals, problem identification, team formation" },
    { week: "3-4", title: "Validation", description: "Market research, customer discovery, MVP planning" },
    { week: "5-6", title: "Development", description: "Technical implementation, product development, testing" },
    { week: "7-8", title: "Launch", description: "Go-to-market strategy, investor preparation, Demo Day" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 particle-bg opacity-50"></div>
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="mb-8">
            {nextCohort && (
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-4" data-testid="hero-badge">
                🚀 Applications open: {nextCohort.name} (starts {formatCohortDate(nextCohort.startDate)})
              </Badge>
            )}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gradient leading-tight">
              Launch Your AI Startup
              <br />
              <span className="text-foreground">With MD Genius</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Join the premier AI startup accelerator. Transform your AI innovation into a thriving business 
              with expert mentorship, comprehensive curriculum, and direct investor access.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 py-4 animate-glow"
              onClick={() => window.location.href = "/login"}
              data-testid="button-apply-now"
            >
              Apply Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-border hover:bg-secondary text-lg px-8 py-4"
              onClick={() => window.location.href = "/login"}
              data-testid="button-login"
            >
              <User className="w-5 h-5 mr-2" />
              Login
            </Button>
          </div>

          {/* Stats section hidden until real data is available */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <Card key={index} className="glass-card border-0">
                  <CardContent className="p-6 text-center">
                    <stat.icon className="w-8 h-8 mx-auto mb-3 text-accent" />
                    <div className="text-2xl font-bold mb-1" data-testid={`stat-value-${index}`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Everything You Need to <span className="text-gradient">Launch & Scale</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our comprehensive program combines technical expertise with business acumen 
              to turn AI innovations into market-ready startups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card border-0 hover:scale-105 transition-transform duration-200">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4" data-testid={`feature-title-${index}`}>{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed" data-testid={`feature-description-${index}`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Program Timeline */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-gradient">8-Week Intensive</span> Program
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From idea to investor-ready startup in just 8 weeks. Our structured curriculum 
              ensures rapid progress without compromising on quality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cohortTimeline.map((phase, index) => (
              <Card key={index} className="glass-card border-0 relative">
                <CardContent className="p-6">
                  <div className="text-primary font-bold text-lg mb-2" data-testid={`phase-week-${index}`}>
                    Week {phase.week}
                  </div>
                  <h3 className="text-lg font-bold mb-3" data-testid={`phase-title-${index}`}>{phase.title}</h3>
                  <p className="text-sm text-muted-foreground" data-testid={`phase-description-${index}`}>
                    {phase.description}
                  </p>
                  {index < cohortTimeline.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-3 h-3 text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Success Stories from <span className="text-gradient">Our Alumni</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join the ranks of successful AI entrepreneurs who transformed their ideas into thriving businesses.
            </p>
          </div>

          {testimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="glass-card border-0">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic mb-6 leading-relaxed" data-testid={`testimonial-content-${index}`}>
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-bold" data-testid={`testimonial-name-${index}`}>{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground" data-testid={`testimonial-role-${index}`}>
                        {testimonial.role}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg mb-4">
                Success stories from our alumni will be featured here soon.
              </div>
              <div className="text-sm text-muted-foreground">
                Check back after our first cohort graduates to see their achievements.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Launch Your <span className="text-gradient">AI Startup?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the next cohort of AI entrepreneurs. Applications are reviewed on a rolling basis 
            with limited spots available.
          </p>
          
          <div className="space-y-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-12 py-4 animate-glow"
              onClick={() => window.location.href = "/login"}
              data-testid="button-start-application"
            >
              Start Your Application
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>No application fee</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Rolling admissions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Global cohorts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">MD Genius AI Launchpad</span>
          </div>
          <p className="text-muted-foreground">
            Transforming AI innovation into successful startups since 2024
          </p>
        </div>
      </footer>
    </div>
  );
}
