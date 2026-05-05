import { TestimonialsColumn } from './TestimonialsColumn';

const testimonials = [
  {
    text: "IntDoc.ai has completely transformed how I handle research. What used to take hours now takes minutes.",
    image: "https://i.pravatar.cc/150?u=sarah",
    name: "Sarah Jenkins",
    role: "Senior Researcher @ TechFlow"
  },
  {
    text: "The precision of the flashcards and quizzes is uncanny. It's like having a personal tutor for every document.",
    image: "https://i.pravatar.cc/150?u=mark",
    name: "Mark Thompson",
    role: "Graduate Student"
  },
  {
    text: "I use it for every legal contract. The AI catches details I might have missed after a long day.",
    image: "https://i.pravatar.cc/150?u=elena",
    name: "Elena Rodriguez",
    role: "Legal Consultant"
  },
  {
    text: "The interface is beautiful and the speed is incredible. This is the future of document analysis.",
    image: "https://i.pravatar.cc/150?u=david",
    name: "David Chen",
    role: "Full Stack Developer"
  },
  {
    text: "As a project manager, I need to digest a lot of info fast. IntDoc.ai is my secret weapon.",
    image: "https://i.pravatar.cc/150?u=lisa",
    name: "Lisa Wong",
    role: "PM @ Innovate"
  },
  {
    text: "Simply the best tool for summarizing long videos. The transcript extraction is flawless.",
    image: "https://i.pravatar.cc/150?u=james",
    name: "James Wilson",
    role: "Content Creator"
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-transparent">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-accent-blue/10 blur-[120px] -z-10 rounded-full opacity-50"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent-purple/10 blur-[100px] -z-10 rounded-full opacity-40"></div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-text-muted bg-clip-text text-transparent">
            Loved by Experts
          </h2>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Join thousands of professionals who have accelerated their learning and productivity with IntDoc AI.
          </p>
        </div>

        {/* Scrollable Columns Container */}
        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[738px] overflow-hidden">
          <TestimonialsColumn 
            testimonials={testimonials.slice(0, 3)} 
            duration={15} 
            className="md:block"
          />
          <TestimonialsColumn 
            testimonials={testimonials.slice(3, 6)} 
            duration={19} 
            className="hidden md:block"
          />
          <TestimonialsColumn 
            testimonials={[...testimonials.slice(1, 3), testimonials[0]]} 
            duration={17} 
            className="hidden lg:block"
          />
        </div>
      </div>
    </section>
  );
};
