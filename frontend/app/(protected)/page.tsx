'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';
import { useCamera, CCTV } from '@/contexts/CameraContext';
import { Video, Eye } from 'lucide-react';
import { LiveRTSPStream } from '@/components/LiveRTSPStream';

interface Incident {
  id: string;
  verificationStatus: string;
  incidentType: string;
  confidenceScore: number;
  detectedAt: string;
  cctv?: { name: string; sector: string; landmark: string };
}

function SyncedVideo({ cam }: { cam: CCTV }) {
  const { getDisplayTime } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      const displayTime = getDisplayTime(cam.id);
      if (displayTime !== undefined) {
        videoRef.current.currentTime = displayTime;
      }
    }
  }, [cam.id, getDisplayTime]);

  return (
    <video
      ref={videoRef}
      src={cam.accidentVideoUrl!}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

export default function LiveMonitoringPage() {
  const {
    cctvs,
    loading,
    gridSize,
    setGridSize,
    selectedCameras,
    setSelectedCameras,
    getMaxCameras,
    isAiEnabled,
    setIsAiEnabled,
    activeCameraId,
    setActiveCameraId,
    pendingIncidents
  } = useCamera();

  const [showSwapFor, setShowSwapFor] = useState<number | null>(null);
  const getGridCols = () => {
    switch (gridSize) {
      case '2x2': return 'grid-cols-1 md:grid-cols-2';
      case '3x3': return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3';
      case '4x4': return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
      default: return 'grid-cols-1 md:grid-cols-2';
    }
  };

  const displayedCameras = selectedCameras.slice(0, getMaxCameras());

  const handleGridChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value as '2x2' | '3x3' | '4x4';
    setGridSize(newSize);
  };

  const handleCameraSwap = (slotIndex: number, newCameraId: string) => {
    const newCamera = cctvs.find(c => c.id === newCameraId);
    if (!newCamera) return;

    setSelectedCameras(prev => {
      const next = [...prev];
      next[slotIndex] = newCamera;
      return next;
    });
    setShowSwapFor(null);
  };

  return (
    // Main Wrapper
    <div suppressHydrationWarning className="w-full h-screen overflow-hidden relative bg-gradient-to-t from-[#0B1326] to-[#0B1326] flex text-white font-sans">

      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full pt-16">
        <TopHeader />
        <div className="w-full h-full p-6 flex flex-col gap-6">

          {/* Header */}
          <header className="flex justify-between items-center w-full shrink-0">
            <div className="flex items-center gap-2">
              <Video className="w-6 h-6 text-[#89CEFF]" />
              <h1 className="text-[#DAE2FD] text-2xl font-semibold">Live Video Streams</h1>
            </div>

            <div className="flex items-center gap-6">
              {/* AI Detection Controls */}
              <div className="flex items-center gap-3 bg-[#131B2E] px-4 py-1.5 rounded-lg border border-[#3E4850]">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center gap-2 border-r border-[#3E4850] pr-3">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-wide">
                    AI Detection:
                  </span>
                  <button
                    onClick={() => setIsAiEnabled(!isAiEnabled)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAiEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAiEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                  <span className={`text-xs font-semibold font-mono w-6 text-left ${isAiEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isAiEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Camera Selector for AI */}
                <div className="flex items-center gap-2">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-wide">
                    AI Target:
                  </span>
                  <select
                    disabled={!isAiEnabled}
                    value={activeCameraId}
                    onChange={(e) => setActiveCameraId(e.target.value)}
                    className="bg-[#222A3D] text-[#DAE2FD] text-xs border border-[#3E4850] rounded px-2 py-0.5 outline-none focus:border-[#89CEFF] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {cctvs.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid Matrix Selector */}
              <div className="flex items-center gap-3">
                <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-wide">
                  Grid Matrix:
                </span>
                <select
                  value={gridSize}
                  onChange={handleGridChange}
                  className="bg-[#222A3D] text-[#DAE2FD] text-sm border border-[#3E4850] rounded px-3 py-1 outline-none focus:border-[#89CEFF]"
                >
                  <option value="2x2">2x2 View (4 Cameras)</option>
                  <option value="3x3">3x3 View (9 Cameras)</option>
                  <option value="4x4">4x4 View (16 Cameras)</option>
                </select>
              </div>
            </div>
          </header>

          {/* Main Workspace (Split Row) */}
          <div className="flex-1 min-h-0 flex gap-6">

            {/* Left Panel: Video Grid */}
            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 flex justify-center items-center text-[#BEC8D2]">Loading streams...</div>
              ) : displayedCameras.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-[#BEC8D2]">No cameras available</div>
              ) : (
                <div className={`h-full grid ${getGridCols()} gap-2 overflow-y-auto pr-2 custom-scrollbar pb-10`}>
                  {displayedCameras.map((cam, index) => {
                    const CardContent = (
                      <>
                        {/* Video Player */}
                        {cam.accidentVideoUrl ? (
                          <SyncedVideo cam={cam} />
                        ) : cam.rtspUrl ? (
                          <LiveRTSPStream cam={cam} />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-[#171F33] flex justify-center items-center">
                            <span className="text-[#3E4850] text-sm font-mono">NO SIGNAL</span>
                          </div>
                        )}

                        {/* Top Overlay Line */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-200/10 group-hover:bg-sky-200/50 transition-colors z-10"></div>

                        {/* Red Overlay for Alerts */}
                        {cam.hasActiveAlert && (
                          <div className="absolute inset-0 bg-red-500/10 z-10 pointer-events-none"></div>
                        )}

                        {/* Camera Name Label */}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded flex items-center gap-2 z-20 ${cam.hasActiveAlert ? 'bg-[#A40217]' : 'bg-black/60 group-hover:bg-[#89CEFF]/20 transition-colors'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${cam.hasActiveAlert ? 'bg-white animate-pulse' : 'bg-[#89CEFF]'}`}></div>
                          <span className="text-white text-[10px] font-mono leading-tight">
                            CAM-{cam.id.slice(-4)}: {cam.name || 'Unknown'}
                            {cam.hasActiveAlert && <><br />ACTIVE ALERT</>}
                          </span>
                        </div>

                        {/* Swap Camera Button */}
                        <div className="absolute top-2 right-2 z-40">
                          {showSwapFor === index ? (
                            <select
                              autoFocus
                              onBlur={() => setShowSwapFor(null)}
                              onChange={(e) => handleCameraSwap(index, e.target.value)}
                              value={cam.id}
                              className="bg-[#222A3D] text-xs text-[#DAE2FD] border border-[#3E4850] rounded px-2 py-1 outline-none"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            >
                              <option disabled value="">Select Camera...</option>
                              {cctvs.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowSwapFor(index);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 bg-black/60 rounded text-xs text-[#BEC8D2] hover:text-white transition-opacity border border-transparent hover:border-[#3E4850]"
                            >
                              ⚙️ Swap
                            </button>
                          )}
                        </div>

                        {/* Hover Engage View (For Alerts) */}
                        {cam.hasActiveAlert && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-3 transition-opacity cursor-pointer backdrop-blur-sm z-30">
                            <Link href={`/incident/${cam.activeIncidentId}`}>
                              <div className="px-5 py-2.5 bg-[#A40217] rounded-xl flex items-center gap-2 shadow-xl hover:bg-red-700 transition-colors w-48 justify-center border border-red-500/50">
                                <Eye className="w-5 h-5 text-white" />
                                <span className="text-white text-base font-bold tracking-wide">ENGAGE VIEW</span>
                              </div>
                            </Link>
                            <Link href={`/camera?id=${cam.id}`}>
                              <div className="px-3 py-1.5 bg-black/60 rounded-lg flex items-center gap-1.5 shadow border border-slate-700 hover:bg-slate-800 transition-colors w-36 justify-center">
                                <Video className="w-3.5 h-3.5 text-[#89CEFF]" />
                                <span className="text-[#89CEFF] text-xs font-medium">Camera Detail</span>
                              </div>
                            </Link>
                          </div>
                        )}
                      </>
                    );

                    const cardClasses = `relative aspect-video rounded overflow-hidden border group transition-all ${cam.hasActiveAlert
                      ? 'bg-[#2D3449] border-red-500 shadow-[0_0_15px_2px_rgba(239,68,68,0.6)]'
                      : 'bg-[#2D3449] border-[#3E4850] hover:border-[#89CEFF] hover:shadow-[0_0_15px_rgba(137,206,255,0.3)] cursor-pointer'
                      }`;

                    return cam.hasActiveAlert ? (
                      <div key={cam.id} className={cardClasses}>
                        {CardContent}
                      </div>
                    ) : (
                      <div
                        key={cam.id}
                        className={cardClasses}
                        onClick={() => window.location.href = `/camera?id=${cam.id}`}
                      >
                        {CardContent}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Panel: Pending Incidents */}
            <div className="w-[320px] shrink-0 bg-[#171F33] rounded-lg border border-[#3E4850] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#3E4850] bg-[#1A233A] flex items-center gap-2">
                <span className="text-[#DAE2FD] font-semibold flex-1">Pending Alerts</span>
                {pendingIncidents.length > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingIncidents.length}</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
                {pendingIncidents.length === 0 ? (
                  <div className="text-center text-[#BEC8D2] text-sm py-10 opacity-60">No pending alerts.</div>
                ) : (
                  pendingIncidents.map(inc => (
                    <div key={inc.id} className="p-3 bg-[#222A3D] border border-red-500/30 rounded flex flex-col gap-2 relative overflow-hidden group shrink-0">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                      <div className="flex justify-between items-start pl-1">
                        <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">DETECTED ALERT</span>
                        <span className="text-[#BEC8D2] text-[10px] font-mono">{new Date(inc.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="pl-1 flex flex-col gap-0.5">
                        <span className="text-[#DAE2FD] text-sm font-semibold leading-tight">{inc.cctv?.name || 'Unknown Camera'}</span>
                        <span className="text-[#BEC8D2] text-xs capitalize">{(inc.incidentType || 'Unknown Alert').replace(/_/g, ' ')}</span>
                      </div>
                      <div className="pl-1 mt-1 flex justify-between items-center">
                        <div className="px-2 py-0.5 border border-red-500/30 rounded-full bg-red-500/10 text-red-400 text-[9px] font-bold">
                          AI CONF: {(inc.confidenceScore * 100).toFixed(0)}%
                        </div>
                        <Link href={`/incident/${inc.id}`}>
                          <div className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors shadow-lg cursor-pointer">
                            Inspect
                          </div>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </main>


    </div>
  );
}
