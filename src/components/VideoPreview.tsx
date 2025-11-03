import { useEffect, useRef } from "react";

interface VideoPreviewProps {
  videoFile: File;
}

const VideoPreview = ({ videoFile }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const url = URL.createObjectURL(videoFile);
      videoRef.current.src = url;
      
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative bg-card rounded-2xl overflow-hidden border border-border shadow-glow-primary">
        <video
          ref={videoRef}
          controls
          className="w-full h-auto"
          style={{ maxHeight: '500px' }}
        >
          Your browser does not support the video tag.
        </video>
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-50" />
      </div>
    </div>
  );
};

export default VideoPreview;
