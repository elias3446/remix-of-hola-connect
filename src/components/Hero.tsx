import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Floating orb */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-accent/5 blur-2xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="container mx-auto px-6 pt-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Welcome to the future</span>
          </div>

          {/* Main heading */}
          <h1 className="animate-fade-up-delay-1 font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            Build something{" "}
            <span className="text-gradient">extraordinary</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up-delay-2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Create powerful, beautiful experiences that captivate your audience and drive results. 
            The platform that makes innovation effortless.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg">
              Start Building
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="lg">
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="animate-fade-up-delay-3 mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground">10K+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground">99%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
