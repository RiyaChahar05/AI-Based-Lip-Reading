import { Mic, Video } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative overflow-hidden py-20 px-4">
      <div className="absolute inset-0 bg-gradient-dark opacity-50" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary rounded-full opacity-20 blur-3xl animate-pulse delay-1000" />
      </div>
      
      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-3 bg-card rounded-xl shadow-glow-primary">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <div className="p-3 bg-card rounded-xl shadow-glow-secondary">
            <Mic className="w-8 h-8 text-secondary" />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          AI Lip Reading
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Transform silent videos into text using advanced artificial intelligence. 
          Upload a video and watch our AI decode speech from lip movements.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Real-time Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
            <span>High Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Easy to Use</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
