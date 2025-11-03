import { CheckCircle, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ResultsDisplayProps {
  transcription: string;
  confidence?: number;
}

const ResultsDisplay = ({ transcription, confidence = 95 }: ResultsDisplayProps) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    toast({
      title: "Copied to clipboard",
      description: "Transcription copied successfully",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lip-reading-transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Transcription saved as text file",
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
            <CheckCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Transcription Complete
            </h3>
            <p className="text-sm text-muted-foreground">
              Confidence: {confidence}%
            </p>
          </div>
        </div>
        
        <div className="bg-muted rounded-xl p-4 mb-4">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {transcription}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-border hover:bg-muted"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-border hover:bg-muted"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
