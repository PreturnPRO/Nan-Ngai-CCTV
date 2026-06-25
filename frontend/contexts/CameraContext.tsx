'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/hooks/use-websocket';
import { toast } from '@/hooks/use-toast';

export interface CCTV {
  id: string;
  name: string;
  rtspUrl: string;
  latitude: number;
  longitude: number;
  status: string;
  accidentVideoUrl: string | null;
  hasActiveAlert: boolean;
  activeIncidentId: string | null;
  sector?: string;
  roadSegment?: string | null;
  landmark?: string | null;
}

export interface Incident {
  id: string;
  verificationStatus: string;
  incidentType: string;
  confidenceScore: number;
  detectedAt: string;
  cctv?: { name: string; sector: string; landmark: string };
}

interface CameraContextType {
  cctvs: CCTV[];
  loading: boolean;
  gridSize: '2x2' | '3x3' | '4x4';
  setGridSize: (size: '2x2' | '3x3' | '4x4') => void;
  selectedCameras: CCTV[];
  setSelectedCameras: React.Dispatch<React.SetStateAction<CCTV[]>>;
  getMaxCameras: () => number;
  getDisplayTime: (id: string) => number | undefined;
  activeCameraId: string;
  setActiveCameraId: React.Dispatch<React.SetStateAction<string>>;
  pendingIncidents: Incident[];
  fetchPendingIncidents: () => Promise<void>;
  wsStatus: string;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
}

// Background processor for a single camera
function BackgroundCameraProcessor({ 
  cam, 
  setDisplayTime,
  onAccidentDetected,
  onIncidentSaved,
  setWsStatus
}: { 
  cam: CCTV, 
  setDisplayTime: (id: string, time: number) => void,
  onAccidentDetected: () => void,
  onIncidentSaved: (incidentId: string) => void,
  setWsStatus: (status: string) => void
}) {
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };

    setIsTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:8000/ws/detect';
  const activeUrl = isTabVisible ? WS_URL : null;
  const { status, send } = useWebSocket(activeUrl, {
    reconnectOnClose: true,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'frame' && data.display_time !== undefined) {
          setDisplayTime(cam.id, data.display_time);
        }
        if (data.type === 'accident') {
          console.log(
            '%c🚨 [FRONTEND WS] COLLISION DETECTED! 🚨',
            'color: white; background: red; font-size: 16px; font-weight: bold; padding: 6px; border-radius: 4px;',
            { camName: cam.name, camId: cam.id, data }
          );
          onAccidentDetected();
        }
        if (data.type === 'incident_saved' && data.incident_id) {
          console.log(
            '%c✅ [FRONTEND WS] INCIDENT SAVED IN DB! ✅',
            'color: white; background: green; font-size: 16px; font-weight: bold; padding: 6px; border-radius: 4px;',
            { camName: cam.name, camId: cam.id, incidentId: data.incident_id, data }
          );
          onIncidentSaved(data.incident_id);
        }
      } catch(e) {
        console.error('[CameraContext WS MESSAGE ERROR] Failed parsing message JSON:', e);
      }
    }
  });
  
  useEffect(() => {
    setWsStatus(status);
  }, [status, setWsStatus]);

  const startedRef = useRef(false);

  useEffect(() => {
    if (status === 'open' && !startedRef.current) {
      startedRef.current = true;
      send(
        JSON.stringify({
          type: 'process_video',
          video_url: cam.accidentVideoUrl ? cam.accidentVideoUrl : cam.rtspUrl,
          camera_name: cam.name,
          camera_id: cam.id,
          latitude: cam.latitude,
          longitude: cam.longitude,
          stream_frames: false,
        })
      );
    }
    if (status === 'closed') {
      startedRef.current = false;
    }
  }, [status, cam.id, cam.name, cam.rtspUrl, cam.accidentVideoUrl, send]);

  return null;
}

export function CameraProvider({ children }: { children: ReactNode }) {
  const [cctvs, setCctvs] = useState<CCTV[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState<'2x2' | '3x3' | '4x4'>('2x2');
  const [selectedCameras, setSelectedCameras] = useState<CCTV[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [pendingIncidents, setPendingIncidents] = useState<Incident[]>([]);
  const [wsStatus, setWsStatus] = useState<string>('idle');
  const displayTimesRef = useRef<Record<string, number>>({});

  const getMaxCameras = useCallback(() => {
    switch (gridSize) {
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      default: return 4;
    }
  }, [gridSize]);

  const fetchCCTVs = async () => {
    try {
      const res = await fetch('/api/cctvs');
      if (res.ok) {
        const data = await res.json();
        setCctvs(data);
        setActiveCameraId(prev => {
          const nextVal = prev || (data.length > 0 ? data[0].id : '');
          return nextVal;
        });
        setSelectedCameras(prev => {
          if (prev.length === 0) {
            return data.slice(0, 16);
          }
          return prev.map((p: CCTV) => data.find((d: CCTV) => d.id === p.id) || p);
        });
      } else {
        console.error('[CameraContext fetchCCTVs] Error response:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch cctvs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingIncidents = async () => {
    try {
      const res = await fetch('/api/incidents?status=PENDING');
      if (res.ok) {
        const data = await res.json();
        setPendingIncidents(data);
      } else {
        console.error('[CameraContext fetchPendingIncidents] Error response:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch pending incidents:', error);
    }
  };

  useEffect(() => {
    fetchCCTVs();
    fetchPendingIncidents();
    const interval = setInterval(() => {
      fetchCCTVs();
      fetchPendingIncidents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const setDisplayTime = useCallback((id: string, time: number) => {
    displayTimesRef.current[id] = time;
  }, []);

  const getDisplayTime = useCallback((id: string) => {
    return displayTimesRef.current[id];
  }, []);

  const activeCamera = cctvs.find(c => c.id === activeCameraId);
  const pathname = usePathname();
  const isLivePage = pathname === '/';

  return (
    <CameraContext.Provider value={{
      cctvs, loading, gridSize, setGridSize, selectedCameras, setSelectedCameras, getMaxCameras, getDisplayTime,
      activeCameraId, setActiveCameraId, pendingIncidents, fetchPendingIncidents, wsStatus
    }}>
      {/* Run background processing only for the active camera on the Live Monitoring page */}
      {isLivePage && activeCamera && (
        <BackgroundCameraProcessor 
          key={`bg-${activeCamera.id}`} 
          cam={activeCamera} 
          setDisplayTime={setDisplayTime} 
          setWsStatus={setWsStatus}
          onAccidentDetected={() => {
            console.log(`[CameraContext onAccidentDetected] Setting active alert for Cam: ${activeCamera.name}`);
            setCctvs(prev => prev.map(c => c.id === activeCamera.id ? { ...c, hasActiveAlert: true } : c));
            toast({
              title: "⚠️ ACCIDENT DETECTED",
              description: `A possible accident has been detected on ${activeCamera.name}.`,
              variant: "destructive",
            });
          }}
          onIncidentSaved={(incidentId) => {
            console.log(`[CameraContext onIncidentSaved] Saved incident ID: ${incidentId} for Cam: ${activeCamera.name}`);
            setCctvs(prev => prev.map(c => c.id === activeCamera.id ? { ...c, hasActiveAlert: true, activeIncidentId: incidentId } : c));
            fetchCCTVs();
            fetchPendingIncidents();
            toast({
              title: "🚨 INCIDENT RECORDED",
              description: `Collision registered for ${activeCamera.name}. Incident ID: ${incidentId.slice(-6).toUpperCase()}`,
              variant: "destructive",
            });
          }}
        />
      )}
      
      {children}
    </CameraContext.Provider>
  );
}
