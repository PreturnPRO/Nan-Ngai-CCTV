'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';
import { useWebSocket } from '@/hooks/use-websocket';

const WS_URL =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:8000/ws/detect';

interface Cctv {
  id: string;
  name: string;
  rtspUrl: string;
  latitude: number;
  longitude: number;
  status: string;
  accidentVideoUrl?: string | null;
  hasAccidentVideo?: boolean;
  roadSegment?: string | null;
  landmark?: string | null;
}

interface NearestAid {
  name: string;
  distanceKm: number;
  etaMinutes: number;
}

export default function CameraDetailPage() {
  return (
    <Suspense fallback={null}>
      <CameraDetailContent />
    </Suspense>
  );
}

function CameraDetailContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');

  const [cctv, setCctv] = useState<Cctv | null>(null);
  const [nearest, setNearest] = useState<NearestAid | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [accident, setAccident] = useState<{
    type: string;
    confidence: number;
    incidentId?: string;
  } | null>(null);
  const startedRef = useRef(false);

  // Pick the requested camera (or the first one) to monitor.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/cctvs');
      if (!res.ok) return;
      const cams: Cctv[] = await res.json();
      if (cancelled || cams.length === 0) return;
      const target = cams.find(c => c.id === requestedId) ?? cams[0];
      setCctv(target);

      const aidRes = await fetch(
        `/api/trafficaid/nearest?lat=${target.latitude}&lng=${target.longitude}`
      );
      if (aidRes.ok && !cancelled) {
        const aid = await aidRes.json();
        if (aid.nearest) setNearest(aid.nearest);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedId]);

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: any;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'frame':
        setFrame(msg.frame);
        break;
      case 'accident':
        setAccident({ type: msg.accident_type, confidence: msg.confidence });
        break;
      case 'incident_saved':
        setAccident(prev =>
          prev ? { ...prev, incidentId: msg.incident_id } : prev
        );
        break;
    }
  }, []);

  const { status, send } = useWebSocket(cctv ? WS_URL : null, {
    onMessage: handleMessage,
    reconnectOnClose: true,
  });

  // Kick off processing once connected. The backend sends a "ready" message,
  // but sending on open is sufficient; guard so we only start once.
  useEffect(() => {
    if (status === 'open' && cctv && !startedRef.current) {
      startedRef.current = true;
      send(
        JSON.stringify({
          type: 'process_video',
          video_url: cctv.hasAccidentVideo
            ? cctv.accidentVideoUrl
            : cctv.rtspUrl,
          camera_name: cctv.name,
          camera_id: cctv.id,
          latitude: cctv.latitude,
          longitude: cctv.longitude,
        })
      );
    }
    if (status === 'closed') startedRef.current = false;
  }, [status, cctv, send]);

  const online = status === 'open';
  const coords = cctv
    ? `${cctv.latitude.toFixed(4)}° N, ${cctv.longitude.toFixed(4)}° E`
    : '—';

  return (
    <div className="w-full h-screen overflow-hidden relative bg-gradient-to-t from-[#020617] to-[#020617] flex text-white font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col relative h-full pt-16">
        <TopHeader />

        <div className="w-full max-w-[1920px] mx-auto px-8 pt-[88px] pb-6 flex flex-col gap-4 h-full overflow-hidden">
          {/* Breadcrumb / Action Bar */}
          <div className="flex justify-between items-center pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[#BEC8D2] text-sm">Monitor</span>
              <div className="w-1.5 h-2 bg-[#3E4850]"></div>
              <span className="text-[#89CEFF] text-sm font-semibold">
                {cctv ? `${cctv.name} Detail` : 'Camera Detail'}
              </span>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-[#222A3D] rounded border border-slate-700 flex items-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <div className="w-4 h-4 bg-[#DAE2FD]"></div>
              <span className="text-[#DAE2FD] text-sm">Back to Monitor</span>
            </Link>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 h-full min-h-0 overflow-hidden">
            {/* Left Video Area — live detection feed */}
            <div className="flex-[2] relative bg-black rounded border border-slate-700 overflow-hidden flex justify-center items-center min-h-[400px]">
              {frame ? (
                <img
                  src={`data:image/jpeg;base64,${frame}`}
                  className="absolute inset-0 w-full h-full object-contain"
                  alt="Live detection feed"
                />
              ) : (
                <div className="text-[#3E4850] text-sm font-mono">
                  {cctv
                    ? online
                      ? 'Awaiting video frames…'
                      : 'Connecting to detection service…'
                    : 'Loading camera…'}
                </div>
              )}

              <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="px-2 py-0.5 bg-[#2D3449] rounded flex items-center gap-1 w-fit">
                      <div
                        className={`w-2 h-2 rounded-sm ${online ? 'bg-emerald-400' : 'bg-[#BEC8D2]'}`}
                      ></div>
                      <span className="text-[#BEC8D2] text-[10px] font-mono leading-none">
                        {online ? '🔴 LIVE DETECTION' : '⏸ OFFLINE'}
                      </span>
                    </div>
                    <span className="text-[#DAE2FD] text-sm font-mono mt-1">
                      CAM_ID: {cctv?.id.slice(0, 8) ?? '—'}
                    </span>
                  </div>

                  {accident && (
                    <div className="p-3 bg-red-950/80 rounded border border-red-500 backdrop-blur-sm flex flex-col gap-1">
                      <span className="text-red-300 text-[11px] font-mono leading-none">
                        ⚠ ACCIDENT DETECTED
                      </span>
                      <span className="text-[#DAE2FD] text-sm font-semibold leading-tight mt-1">
                        {accident.type} · {Math.round(accident.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end">
                  <span className="text-[#3E4850] text-[10px] font-mono">
                    WS: {status.toUpperCase()}
                  </span>
                  <span className="text-[#BEC8D2] text-xs font-mono">
                    {cctv?.roadSegment ?? coords}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 pb-4 custom-scrollbar">
              <div className="p-6 bg-[#171F33] rounded-lg border border-slate-700 flex flex-col gap-6 shrink-0">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[#DAE2FD] text-lg font-semibold leading-none">
                      Incident Profile
                    </h2>
                    <span className="text-[#BEC8D2] text-sm mt-1">
                      {accident?.incidentId
                        ? `Ref ID: #${accident.incidentId.slice(0, 8)}`
                        : cctv?.name ?? 'No camera'}
                    </span>
                  </div>
                  {accident ? (
                    <div className="px-3 py-1 bg-red-500/10 rounded-full border border-red-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-red-400 text-sm font-mono uppercase font-semibold">
                        ACCIDENT ALERT
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-sky-500/10 rounded-full border border-sky-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
                      <span className="text-sky-400 text-sm font-mono uppercase font-semibold">
                        SYSTEM NORMAL / NO ALERTS
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="p-4 bg-[#131B2E] rounded border border-slate-700 flex flex-col gap-1">
                    <span className="text-[#3E4850] text-[10px] font-mono uppercase leading-none">
                      ROAD SEGMENT
                    </span>
                    <span className="text-[#DAE2FD] text-base font-semibold mt-1">
                      {cctv?.roadSegment ?? 'Unknown segment'}
                    </span>
                  </div>
                  <div className="p-4 bg-[#131B2E] rounded border border-slate-700 flex flex-col gap-1">
                    <span className="text-[#3E4850] text-[10px] font-mono uppercase leading-none">
                      COORDINATES
                    </span>
                    <span className="text-[#DAE2FD] text-sm font-mono mt-1">
                      {coords}
                    </span>
                  </div>
                  <div className="p-4 bg-[#131B2E] rounded border border-slate-700 flex flex-col gap-1">
                    <span className="text-[#3E4850] text-[10px] font-mono uppercase leading-none">
                      CLOSEST LANDMARK
                    </span>
                    <span className="text-[#DAE2FD] text-base mt-1">
                      {nearest
                        ? `${nearest.name} — ${nearest.distanceKm}km`
                        : cctv?.landmark ?? 'No aid post data'}
                    </span>
                  </div>
                </div>

                <div className="h-48 relative bg-[#0B1326] rounded border border-slate-700 overflow-hidden flex justify-center items-center shrink-0">
                  <img
                    src="https://placehold.co/740x190/0B1326/3E4850?text=MAP+VIEW"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
                  />
                  <div className="absolute top-[40%] left-[45%] w-6 h-6 bg-orange-400/30 rounded-full flex justify-center items-center shadow-[0_0_15px_rgba(216,138,0,0.4)]">
                    <div className="w-2 h-2 bg-[#FFB95F] rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="mt-auto shrink-0 pt-4 flex flex-col gap-4">
                <Link
                  href={
                    accident?.incidentId
                      ? `/incident/${accident.incidentId}`
                      : '/incident-log'
                  }
                  className="w-full"
                >
                  <button className="w-full py-5 bg-[#89CEFF] rounded-lg border border-sky-300/20 flex justify-center items-center gap-3 hover:bg-sky-400 transition-colors shadow-lg">
                    <div className="w-5 h-5 bg-[#003751] rounded-sm"></div>
                    <span className="text-[#003751] text-lg font-bold uppercase tracking-wide">
                      {accident?.incidentId
                        ? '📊 VIEW THIS INCIDENT'
                        : '📊 VIEW THIS CAMERA LOGS'}
                    </span>
                  </button>
                </Link>

                <div className="p-4 bg-[#131B2E] rounded border border-slate-700 border-l-4 border-l-[#89CEFF] flex flex-col gap-2">
                  <span className="text-[#3E4850] text-[10px] font-mono uppercase">
                    LIVE QUEUE STATUS
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-[#89CEFF]'}`}
                    ></div>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-[#DAE2FD] text-sm">Camera Status:</span>
                      <span className="text-[#89CEFF] text-sm">
                        {online ? 'Online' : 'Offline'}
                      </span>
                      <span className="text-[#DAE2FD] text-sm mx-1">
                        | Nearest Unit ETA:
                      </span>
                      <span className="text-[#89CEFF] text-sm">
                        {nearest ? `${nearest.etaMinutes} min` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
