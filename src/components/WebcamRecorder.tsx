import { useState, useRef, useEffect } from "react";
import { Camera, Video, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WebcamRecorderProps {
  onRecordingComplete: (file: File) => void;
  onClose: () => void;
}

const WebcamRecorder = ({ onRecordingComplete, onClose }: WebcamRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to record video",
        variant: "destructive",
      });
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setIsPreviewing(true);
      
      // Show preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
      }
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleUseRecording = () => {
    if (recordedBlob) {
      const file = new File([recordedBlob], `recording-${Date.now()}.webm`, {
        type: 'video/webm',
      });
      onRecordingComplete(file);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setIsPreviewing(false);
    setRecordedBlob(null);
    setRecordingTime(0);
    
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.srcObject = stream;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-full flex flex-col">
        <div className="flex items-center justify-between py-4">
          <h2 className="text-2xl font-bold text-foreground">Record Video</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <div className="relative w-full max-w-4xl">
            <div className="relative bg-card rounded-2xl overflow-hidden border-2 border-border shadow-glow-primary">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={!isPreviewing}
                className="w-full h-auto"
                style={{ maxHeight: '70vh' }}
              />
              
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 backdrop-blur-sm px-4 py-2 rounded-full">
                  <div className="w-3 h-3 bg-foreground rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-destructive-foreground">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-6">
              {!isPreviewing ? (
                <>
                  {!isRecording ? (
                    <Button
                      size="lg"
                      onClick={startRecording}
                      className="bg-gradient-primary shadow-glow-primary hover:opacity-90 px-8"
                    >
                      <Video className="w-5 h-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={stopRecording}
                      variant="destructive"
                      className="px-8"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRetake}
                    className="border-border hover:bg-muted"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleUseRecording}
                    className="bg-gradient-primary shadow-glow-primary hover:opacity-90"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Use This Recording
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamRecorder;
