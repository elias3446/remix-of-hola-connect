import { Zap, Shield, Palette, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized performance that delivers instant results with zero latency.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Enterprise-grade security built into every layer of the platform.",
  },
  {
    icon: Palette,
    title: "Beautiful UI",
    description: "Stunning interfaces that delight users and elevate your brand.",
  },
  {
    icon: Globe,
    title: "Global Scale",
    description: "Infrastructure that scales seamlessly to millions of users worldwide.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Everything you need
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features designed to help you build, launch, and scale your next big idea.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
