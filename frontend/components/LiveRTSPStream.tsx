'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { CCTV } from '@/contexts/CameraContext';

export function LiveRTSPStream({ cam }: { cam: CCTV }) {
  const [frame, setFrame] = useState<string | null>(null);
  
  const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:8000/ws/detect';
  
  const { status, send } = useWebSocket(WS_URL, {
    reconnectOnClose: true,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'frame' && data.frame) {
          setFrame(data.frame);
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  });

  const startedRef = useRef(false);

  useEffect(() => {
    if (status === 'open' && !startedRef.current) {
      startedRef.current = true;
      send(
        JSON.stringify({
          type: 'process_video',
          video_url: cam.rtspUrl,
          camera_name: cam.name,
          camera_id: cam.id,
          latitude: cam.latitude,
          longitude: cam.longitude,
          stream_frames: true,
          run_ai: false, // Don't run YOLO for pure viewing to save resources
        })
      );
    }
    if (status === 'closed') {
      startedRef.current = false;
    }
  }, [status, cam, send]);

  if (!frame) {
    return (
      <div className="absolute inset-0 w-full h-full bg-[#171F33] flex flex-col justify-center items-center">
        <div className="w-6 h-6 border-2 border-[#89CEFF] border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-[#3E4850] text-sm font-mono">CONNECTING TO STREAM...</span>
      </div>
    );
  }

  return (
    <img
      src={`data:image/jpeg;base64,${frame}`}
      alt={`${cam.name} Feed`}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
