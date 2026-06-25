import { useEffect, useRef } from 'react';
import { User } from 'lucide-react';

export default function VideoPlayer({ stream, muted = false, isCamOff = false, className = '', label = '' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-bg-secondary overflow-hidden ${className}`}>
      {stream && !isCamOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-bg-card border border-border flex items-center justify-center">
            <User size={28} className="text-text-muted" />
          </div>
          {isCamOff && (
            <span className="text-text-muted text-sm">Camera off</span>
          )}
        </div>
      )}

      {label && (
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs
                        px-2.5 py-1 rounded-lg font-medium">
          {label}
        </div>
      )}
    </div>
  );
}
