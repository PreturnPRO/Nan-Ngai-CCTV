'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';
import { useToast } from '@/hooks/use-toast';

interface CCTV {
  id: string;
  name: string;
  rtspUrl: string;
  accidentVideoUrl: string | null;
  latitude: number;
  longitude: number;
  sector: string;
  landmark: string;
}

interface Incident {
  id: string;
  cctvId: string;
  cctv: CCTV;
  detectedAt: string;
  verificationStatus: string;
  incidentType: string;
  imageUrl: string | null;
  videoClipUrl: string | null;
  confidenceScore: number;
}

export default function EvidencePage() {
  const params = useParams();
  const { toast } = useToast();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const id = params?.id as string;

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data);
      } else {
        toast({ title: 'Error fetching incident', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to load incident details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      fetchIncident();
    }
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (incident && !incident.videoClipUrl) {
      // Poll every 3 seconds if video is not yet ready
      interval = setInterval(() => {
        fetchIncident();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [incident, id]);

  if (!isMounted) {
    return null;
  }

  if (loading) {
    return (
      <div suppressHydrationWarning className="w-full h-screen bg-[#0B1326] flex justify-center items-center text-[#BEC8D2]">
        <span className="animate-bounce">Loading Evidence Data...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div suppressHydrationWarning className="w-full h-screen bg-[#0B1326] flex justify-center items-center flex-col gap-4">
        <span className="text-[#DAE2FD] text-xl">Incident evidence not found</span>
        <Link href="/incident-log" className="px-4 py-2 bg-[#2D3449] rounded text-white hover:bg-slate-700">
          Back to Logs
        </Link>
      </div>
    );
  }

  const detectedDate = new Date(incident.detectedAt);
  const formattedDate = detectedDate.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B1326] flex text-white font-sans">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full pt-16">

        <TopHeader />

        {/* Content Wrapper */}
        <div className="w-full h-full pt-20 px-8 pb-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">

          {/* Header & Back Link */}
          <div className="flex flex-col gap-4 shrink-0">
            <Link href="/incident-log" className="flex items-center gap-2 w-fit group">
              <div className="w-4 h-4 bg-[#89CEFF] group-hover:bg-white transition-colors"></div>
              <span className="text-[#89CEFF] text-xs font-mono font-medium tracking-wide group-hover:text-white transition-colors">Back to Logs List</span>
            </Link>

            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <h1 className="text-[#DAE2FD] text-2xl font-semibold leading-tight">Log #{incident.id.slice(-6).toUpperCase()}</h1>
                <p className="text-[#BEC8D2] text-sm">{incident.cctv?.sector || 'Unknown Sector'} - {incident.cctv?.landmark || 'Unknown Location'} | {formattedDate}</p>
              </div>
              <div className="px-4 py-2 bg-[#222A3D] rounded border border-[#3E4850] flex items-center gap-3">
                <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-wide">STATUS</span>
                <div className="px-2 py-0.5 bg-green-900 rounded flex items-center">
                  <span className="text-[#84e3a4] text-[10px] font-bold">{incident.verificationStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 min-h-0">
            {/* Left Column - Video Player & Details */}
            <div className="flex-[3] flex flex-col gap-4">

              {/* Video Player */}
              <div className="relative bg-[#171F33] rounded-lg border border-[#3E4850] shadow-[0_0_20px_rgba(137,206,255,0.15)] overflow-hidden aspect-video w-full flex flex-col justify-end">
                {incident.videoClipUrl ? (
                  <video src={incident.videoClipUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay controls playsInline />
                ) : incident.imageUrl ? (
                  <img src={incident.imageUrl} className="absolute inset-0 w-full h-full object-contain" alt="Accident Detection" />
                ) : incident.cctv?.accidentVideoUrl ? (
                  <video src={incident.cctv.accidentVideoUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay controls playsInline />
                ) : incident.cctv?.rtspUrl && incident.cctv.rtspUrl.endsWith('.mp4') ? (
                  <video src={incident.cctv.rtspUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay controls playsInline />
                ) : (
                  <img src="https://placehold.co/1211x636" className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen" alt="Video Feed" />
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent"></div>

                {/* Top Label */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded border border-white/20">
                  <span className="text-[#89CEFF] text-xs font-mono">REC [CAM_SOUTH_J14_01] 2024-03-12 14:22:15</span>
                </div>
              </div>

              {/* Clip Editor / Trimmer Bar */}
              <div className="w-full py-4 bg-[#131B2E] rounded border border-slate-700 flex items-center shrink-0">
                <div className="px-5 flex items-center gap-4 shrink-0">
                  <div className="w-[22px] h-3.5 bg-[#DAE2FD]"></div>
                  <div className="w-10 h-10 bg-[#89CEFF] rounded-xl flex justify-center items-center">
                    <div className="w-3 h-3.5 bg-[#003751]"></div>
                  </div>
                  <div className="w-[22px] h-3.5 bg-[#DAE2FD]"></div>
                </div>

                <div className="flex-1 flex items-center px-8 relative">
                  <div className="w-full h-1 bg-[#2D3449] rounded-full relative">
                    <div className="absolute left-[25%] right-[10%] h-full bg-[#89CEFF] rounded-full"></div>
                    <div className="absolute left-[25%] h-full w-[8%] bg-[#FFB95F] rounded-l-full"></div>
                  </div>
                </div>

                <div className="px-5 shrink-0 text-[#BEC8D2] text-sm font-mono">00:10 / 00:30</div>
              </div>

              {/* Info & Download Bar */}
              <div className="w-full p-4 bg-[#131B2E] rounded-lg border border-[#3E4850] flex justify-between items-center shrink-0">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#BEC8D2] text-[10px] font-bold uppercase">SOURCE</span>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium">M25-S14-C1</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#BEC8D2] text-[10px] font-bold uppercase">ENCODING</span>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium">H.265 / 4K</span>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-[#2D3449] rounded border border-[#3E4850] flex items-center gap-2 hover:bg-slate-700 transition-colors">
                  <div className="w-4 h-4 bg-[#DAE2FD]"></div>
                  <span className="text-[#DAE2FD] text-xs font-mono font-medium tracking-wide">Download Video Clip</span>
                </button>
              </div>

            </div>

            {/* Right Column - Analysis & Notes */}
            <div className="flex-[1] min-w-[320px] flex flex-col gap-6">
              <div className="w-full p-6 bg-[#171F33] rounded-lg border border-[#3E4850] shadow-xl flex flex-col gap-8 h-full">

                {/* Incident Outcome */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">INCIDENT OUTCOME</span>
                  <div className="p-4 bg-red-900/20 border-l-4 border-[#FFB4AB] shadow-[0_0_20px_rgba(239,68,68,0.2)] rounded-r flex items-center gap-4">
                    <div className="w-5 h-5 bg-[#FFB4AB]"></div>
                    <div className="flex flex-col">
                      <span className="text-[#FFB4AB] text-lg font-bold leading-tight">CONFIRMED<br />ACCIDENT</span>
                      <span className="text-[#BEC8D2] text-xs mt-1">Verified by Sector Lead at<br />14:24:02</span>
                    </div>
                  </div>
                </div>

                {/* Temporal Analysis (Timeline) */}
                <div className="flex flex-col gap-4">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">TEMPORAL ANALYSIS</span>
                  <div className="pl-4 relative flex flex-col gap-6">
                    {/* Timeline vertical line */}
                    <div className="absolute left-[3px] top-2 bottom-4 w-0.5 bg-[#3E4850]"></div>

                    {/* Timeline Item 1 */}
                    <div className="relative pl-6">
                      <div className="absolute left-[-5px] top-3 w-2.5 h-2.5 bg-[#FFB95F] rounded-full border-2 border-[#0B1326] ring-2 ring-[#FFB95F]/30"></div>
                      <div className="p-3 bg-[#222A3D] rounded border border-[#3E4850] flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[#FFB95F] text-[10px] font-bold uppercase">AI DETECTED</span>
                          <span className="text-[#DAE2FD] text-xs font-mono">{formattedDate}</span>
                        </div>
                        <span className="text-[#DAE2FD] text-sm">Accident detected in {incident.cctv?.name} area.<br />Confidence: {(incident.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Timeline Item 2 */}
                    <div className="relative pl-6">
                      <div className="absolute left-[-5px] top-3 w-2.5 h-2.5 bg-[#89CEFF] rounded-full border-2 border-[#0B1326] ring-2 ring-[#89CEFF]/30"></div>
                      <div className="p-3 bg-[#222A3D] rounded border border-[#3E4850] flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[#89CEFF] text-[10px] font-bold uppercase">OPERATOR CONFIRMED</span>
                        </div>
                        <span className="text-[#DAE2FD] text-sm">Manual visual verification completed.</span>
                      </div>
                    </div>

                    {/* Timeline Item 3 */}
                    <div className="relative pl-6">
                      <div className="absolute left-[-5px] top-3 w-2.5 h-2.5 bg-[#FFB3AD] rounded-full border-2 border-[#0B1326] ring-2 ring-[#FFB3AD]/30"></div>
                      <div className="p-3 bg-[#222A3D] rounded border border-[#3E4850] flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[#FFB3AD] text-[10px] font-bold uppercase">RESCUE DISPATCHED</span>
                          <span className="text-[#DAE2FD] text-xs font-mono">14:23:30</span>
                        </div>
                        <span className="text-[#DAE2FD] text-sm">Emergency Services Unit [ESU-<br />09] en route.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Command Log Notes */}
                <div className="flex flex-col gap-4 mt-auto">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">COMMAND LOG NOTES</span>
                  <div className="p-4 bg-[#131B2E] rounded border border-[#3E4850] text-[#DAE2FD] text-sm leading-relaxed">
                    Event captured by camera {incident.cctv?.name}. Currently awaiting dispatch team.
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-6 h-6 bg-[#0EA5E9] rounded-full flex justify-center items-center text-[#003751] text-[10px] font-bold">JD</div>
                    <span className="text-[#BEC8D2] text-[10px] font-mono">Logged by John Doe (Senior Dispatcher)</span>
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
