import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import VideoUploader from "@/components/VideoUploader";
import VideoPreview from "@/components/VideoPreview";
import ProcessingState from "@/components/ProcessingState";
import ResultsDisplay from "@/components/ResultsDisplay";
import WebcamRecorder from "@/components/WebcamRecorder";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Camera } from "lucide-react";

type AppState = 'upload' | 'preview' | 'processing' | 'results';

const Index = () => {
  const [state, setState] = useState<AppState>('upload');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [showWebcam, setShowWebcam] = useState(false);

  const handleVideoSelect = (file: File | null) => {
    setSelectedVideo(file);
    if (file) {
      setState('preview');
    } else {
      setState('upload');
    }
  };

  const handleProcess = () => {
    setState('processing');
    setProgress(0);
    
    // Simulate processing with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Simulate transcription result
          setTranscription("Hello, this is a demonstration of AI-powered lip reading technology. The system analyzes video frames to detect lip movements and converts them into readable text.");
          setState('results');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleReset = () => {
    setState('upload');
    setSelectedVideo(null);
    setProgress(0);
    setTranscription("");
  };

  const handleWebcamRecording = (file: File) => {
    setSelectedVideo(file);
    setState('preview');
    setShowWebcam(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      
      <div className="container mx-auto px-4 pb-20">
        <div className="space-y-8">
          {state === 'upload' && (
            <>
              <VideoUploader
                onVideoSelect={handleVideoSelect}
                selectedVideo={selectedVideo}
              />
              
              <div className="flex items-center gap-4 max-w-2xl mx-auto">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => setShowWebcam(true)}
                  className="bg-gradient-primary shadow-glow-primary hover:opacity-90"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Record with Webcam
                </Button>
              </div>
            </>
          )}
          
          {state === 'preview' && selectedVideo && (
            <div className="space-y-6">
              <VideoPreview videoFile={selectedVideo} />
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-border hover:bg-muted"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Choose Different Video
                </Button>
                <Button
                  onClick={handleProcess}
                  className="bg-gradient-primary shadow-glow-primary hover:opacity-90"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Processing
                </Button>
              </div>
            </div>
          )}
          
          {state === 'processing' && (
            <ProcessingState progress={progress} />
          )}
          
          {state === 'results' && (
            <div className="space-y-6">
              <ResultsDisplay transcription={transcription} />
              <div className="flex justify-center">
                <Button
                  onClick={handleReset}
                  className="bg-gradient-primary shadow-glow-primary hover:opacity-90"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Another Video
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showWebcam && (
        <WebcamRecorder
          onRecordingComplete={handleWebcamRecording}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
};

export default Index;
