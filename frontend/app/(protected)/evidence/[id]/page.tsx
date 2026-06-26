'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, AlertTriangle, XCircle, Clock } from 'lucide-react';

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

interface IncidentHistory {
  id: string;
  status: string;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
}
interface Incident {
  id: string;
  cctvId: string;
  cctv: CCTV;
  detectedAt: string;
  verificationStatus: string;
  incidentType: string | null;
  severity: string | null;
  imageUrl: string | null;
  videoClipUrl: string | null;
  confidenceScore: number;
  notes: string | null;
  verifiedAt: string | null;
  verifiedByUser: { id: string; name: string | null; email: string; image: string | null } | null;
  resolvedAt: string | null;
  resolvedByUser: { id: string; name: string | null; email: string; image: string | null } | null;
  history: IncidentHistory[];
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
      const res = await fetch(`/api/incidents/${id}?t=${Date.now()}`);
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
              <ArrowLeft className="w-4 h-4 text-[#89CEFF] group-hover:text-white transition-colors" />
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
                  <video src={incident.videoClipUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay muted controls playsInline loop />
                ) : incident.imageUrl ? (
                  <img src={incident.imageUrl} className="absolute inset-0 w-full h-full object-contain" alt="Accident Detection" />
                ) : incident.cctv?.accidentVideoUrl ? (
                  <video src={incident.cctv.accidentVideoUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay muted controls playsInline loop />
                ) : incident.cctv?.rtspUrl && incident.cctv.rtspUrl.endsWith('.mp4') ? (
                  <video src={incident.cctv.rtspUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay muted controls playsInline loop />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-[#131B2E] flex flex-col justify-center items-center gap-4 opacity-80 mix-blend-screen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#3E4850]"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                    <span className="text-[#3E4850] text-sm font-mono tracking-widest">VIDEO FEED UNAVAILABLE</span>
                  </div>
                )}

                {/* Top Label */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded border border-white/20 z-10">
                  <span className="text-[#89CEFF] text-xs font-mono">REC [{incident.cctv?.name || incident.cctvId.slice(0, 8)}] {formattedDate}</span>
                </div>
              </div>
              {/* Info & Download Bar */}
              <div className="w-full p-4 bg-[#131B2E] rounded-lg border border-[#3E4850] flex justify-between items-center shrink-0">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#BEC8D2] text-[10px] font-bold uppercase">SOURCE</span>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium">{incident.cctv?.name || incident.cctvId.slice(0, 8)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#BEC8D2] text-[10px] font-bold uppercase">ENCODING</span>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium">H.264 / 1080p</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const url = incident.videoClipUrl || incident.cctv?.accidentVideoUrl || incident.cctv?.rtspUrl;
                    if (!url) return;
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `incident-${incident.id}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="px-6 py-2.5 bg-[#2D3449] rounded border border-[#3E4850] flex items-center gap-2 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#DAE2FD]" />
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
                  <div className={`p-4 ${incident.verificationStatus === 'APPROVED' ? 'bg-red-900/20 border-l-4 border-[#FFB4AB] shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-[#222A3D] border border-[#3E4850]'} rounded-r flex items-center gap-4`}>
                    {incident.verificationStatus === 'APPROVED' ? (
                      <AlertTriangle className="w-5 h-5 text-[#FFB4AB]" />
                    ) : incident.verificationStatus === 'REJECTED' ? (
                      <XCircle className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-[#89CEFF]" />
                    )}
                    <div className="flex flex-col">
                      <span className={`${incident.verificationStatus === 'APPROVED' ? 'text-[#FFB4AB]' : incident.verificationStatus === 'REJECTED' ? 'text-slate-400' : 'text-[#DAE2FD]'} text-lg font-bold leading-tight`}>
                        {incident.verificationStatus === 'APPROVED' ? 'CONFIRMED\nACCIDENT' : incident.verificationStatus === 'REJECTED' ? 'FALSE\nALARM' : 'PENDING\nREVIEW'}
                      </span>
                      {incident.verifiedAt && (
                        <span className="text-[#BEC8D2] text-xs mt-1">
                          Verified by {incident.verifiedByUser?.name || 'User'} at<br />{new Date(incident.verifiedAt).toLocaleTimeString('en-GB')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Temporal Analysis (Timeline) */}
                <div className="flex flex-col gap-4">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">TEMPORAL ANALYSIS</span>
                  <div className="pl-4 relative flex flex-col gap-6">
                    {/* Timeline vertical line */}
                    {incident.history && incident.history.length > 0 && (
                      <div className="absolute left-[3px] top-2 bottom-4 w-0.5 bg-[#3E4850]"></div>
                    )}

                    {incident.history && incident.history.map((hist) => {
                      const date = new Date(hist.createdAt);
                      let dotClass = 'bg-[#89CEFF] ring-[#89CEFF]/30';
                      let textClass = 'text-[#89CEFF]';
                      if (hist.status === 'PENDING') { dotClass = 'bg-[#FFB95F] ring-[#FFB95F]/30'; textClass = 'text-[#FFB95F]'; }
                      else if (hist.status === 'APPROVED') { dotClass = 'bg-[#FFB4AB] ring-[#FFB4AB]/30'; textClass = 'text-[#FFB4AB]'; }
                      else if (hist.status === 'DISPATCHED') { dotClass = 'bg-[#FFB3AD] ring-[#FFB3AD]/30'; textClass = 'text-[#FFB3AD]'; }
                      else if (hist.status === 'RESOLVED') { dotClass = 'bg-[#84e3a4] ring-[#84e3a4]/30'; textClass = 'text-[#84e3a4]'; }
                      else if (hist.status === 'REJECTED') { dotClass = 'bg-slate-400 ring-slate-400/30'; textClass = 'text-slate-400'; }

                      return (
                        <div key={hist.id} className="relative pl-6">
                          <div className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-[#0B1326] ring-2 ${dotClass}`}></div>
                          <div className="p-3 bg-[#222A3D] rounded border border-[#3E4850] flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className={`${textClass} text-[10px] font-bold uppercase`}>{hist.status}</span>
                              <span className="text-[#DAE2FD] text-xs font-mono">{date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                            {hist.notes && <span className="text-[#DAE2FD] text-sm whitespace-pre-wrap">{hist.notes}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Command Log Notes */}
                {incident.notes && (
                  <div className="flex flex-col gap-4 mt-auto">
                    <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">COMMAND LOG NOTES</span>
                    <div className="p-4 bg-[#131B2E] rounded border border-[#3E4850] text-[#DAE2FD] text-sm leading-relaxed whitespace-pre-wrap">
                      {incident.notes}
                    </div>
                    {incident.verifiedByUser && (
                      <div className="flex items-center gap-2 pt-2">
                        <div className="w-6 h-6 bg-[#0EA5E9] rounded-full flex justify-center items-center text-[#003751] text-[10px] font-bold uppercase">
                          {incident.verifiedByUser.name ? incident.verifiedByUser.name.substring(0, 2) : 'U'}
                        </div>
                        <span className="text-[#BEC8D2] text-[10px] font-mono">Logged by {incident.verifiedByUser.name || incident.verifiedByUser.email}</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
