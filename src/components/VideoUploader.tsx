import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  selectedVideo: File | null;
}

const VideoUploader = ({ onVideoSelect, selectedVideo }: VideoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast({
        title: "File too large",
        description: "Please select a video smaller than 100MB",
        variant: "destructive",
      });
      return;
    }
    
    onVideoSelect(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    onVideoSelect(null as any);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      
      {!selectedVideo ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 hover:border-primary hover:shadow-glow-primary
            ${isDragging ? 'border-primary bg-card shadow-glow-primary' : 'border-border bg-card'}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow-primary">
              <Upload className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                {isDragging ? 'Drop video here' : 'Upload Video'}
              </h3>
              <p className="text-muted-foreground">
                Drag and drop or click to select a video file
              </p>
              <p className="text-sm text-muted-foreground">
                Supports MP4, MOV, AVI • Max 100MB
              </p>
            </div>
            
            <Button className="mt-4 bg-gradient-primary shadow-glow-primary hover:opacity-90">
              Choose File
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative bg-card rounded-2xl p-6 border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow-primary">
              <Upload className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{selectedVideo.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
