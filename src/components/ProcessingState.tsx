import { Loader2, Brain } from "lucide-react";

interface ProcessingStateProps {
  progress?: number;
}

const ProcessingState = ({ progress = 0 }: ProcessingStateProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl p-8 border border-border">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative p-6 bg-card rounded-full border-2 border-primary shadow-glow-primary">
              <Brain className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Processing Video
            </h3>
            <p className="text-muted-foreground">
              Our AI is analyzing lip movements...
            </p>
          </div>
          
          <div className="w-full space-y-2">
            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-primary transition-all duration-500 shadow-glow-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {progress}% Complete
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            <div className="px-3 py-1 bg-muted rounded-full text-muted-foreground">
              Extracting frames
            </div>
            <div className="px-3 py-1 bg-muted rounded-full text-muted-foreground">
              Analyzing movements
            </div>
            <div className="px-3 py-1 bg-muted rounded-full text-muted-foreground">
              Generating text
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingState;
