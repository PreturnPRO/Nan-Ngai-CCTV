'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });
import { AlertTriangle, MapPin, CheckCircle, XCircle, Trash2, Camera, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CCTV {
  id: string;
  name: string;
  rtspUrl: string;
  latitude: number;
  longitude: number;
  sector: string;
  landmark: string;
  accidentVideoUrl?: string | null;
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
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      fetchIncident();
    }
  }, [id]);

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

  const handleVerify = async (status: 'APPROVED' | 'REJECTED') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          verificationStatus: status,
          responseNeeded: status === 'APPROVED'
        })
      });

      if (res.ok) {
        toast({ title: `Incident marked as ${status}` });
        if (status === 'APPROVED') {
          router.push(`/evidence/${id}`);
        } else {
          router.push('/');
        }
      } else {
        toast({ title: 'Update failed', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error processing verification', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div suppressHydrationWarning className="w-full h-screen bg-[#020617] flex justify-center items-center text-[#BEC8D2]">
        <span className="animate-bounce">Loading Incident Data...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div suppressHydrationWarning className="w-full h-screen bg-[#020617] flex justify-center items-center flex-col gap-4">
        <span className="text-[#DAE2FD] text-xl">Incident not found</span>
        <Link href="/" className="px-4 py-2 bg-[#2D3449] rounded text-white hover:bg-slate-700">
          Return to Monitor
        </Link>
      </div>
    );
  }

  const d = new Date(incident.detectedAt);
  const formattedDate = d.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
  });

  return (
    <div suppressHydrationWarning className="w-full h-screen overflow-hidden relative bg-gradient-to-t from-[#020617] to-[#020617] flex text-white font-sans">

      <Sidebar />

      <main className="flex-1 flex flex-col relative h-full pt-16">
        <TopHeader />

        <div className="w-full max-w-[1920px] mx-auto px-8 pt-[88px] pb-6 flex flex-col gap-4 h-full overflow-hidden">

          <div className="flex justify-between items-center pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[#BEC8D2] text-sm">Monitor</span>
              <div className="w-1.5 h-2 bg-[#3E4850]"></div>
              <span className="text-[#89CEFF] text-sm font-semibold">Incident Detail</span>
            </div>
            <Link href="/" className="px-4 py-2 bg-[#222A3D] rounded border border-slate-700 flex items-center gap-2 hover:bg-slate-800 transition-colors">
              <span className="text-[#DAE2FD] text-sm">&larr; Back to Monitor</span>
            </Link>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 h-full min-h-0 overflow-hidden">

            {/* Left Video Area */}
            <div className="flex-[2] relative bg-black rounded border border-slate-700 overflow-hidden flex justify-center items-center min-h-[400px]">
              {incident.videoClipUrl ? (
                <video src={incident.videoClipUrl} className="absolute inset-0 w-full h-full object-contain" autoPlay loop muted playsInline />
              ) : incident.imageUrl ? (
                <img src={incident.imageUrl} className="absolute inset-0 w-full h-full object-contain" alt="Accident Detection" />
              ) : incident.cctv?.accidentVideoUrl ? (
                <video src={incident.cctv.accidentVideoUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" autoPlay loop muted playsInline />
              ) : incident.cctv?.rtspUrl && incident.cctv.rtspUrl.endsWith('.mp4') ? (
                <video src={incident.cctv.rtspUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" autoPlay loop muted playsInline />
              ) : (
                <img src="https://placehold.co/790x840" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen" />
              )}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-200/20"></div>

              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="px-2 py-0.5 bg-red-600 rounded flex items-center gap-2 w-fit">
                      <Camera className="w-3 h-3 text-white" />
                      <span className="text-white text-[10px] font-mono leading-none">LIVE FEED</span>
                    </div>
                    <span className="text-[#DAE2FD] text-sm font-mono mt-1">REC {incident.id.slice(-6).toUpperCase()} // CAM_ID: {incident.cctv?.id.slice(-4) || 'UNK'}</span>
                  </div>

                  <div className="w-[210px] p-3 bg-[#0B1326]/80 rounded border border-orange-300/50 shadow-[0_0_15px_rgba(216,138,0,0.4)] backdrop-blur-md flex flex-col gap-1">
                    <span className="text-[#FFB95F] text-[11px] font-mono leading-none flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> DETECTION STATUS</span>
                    <span className="text-[#DAE2FD] text-lg font-semibold leading-tight mt-1">{incident.incidentType?.replace('_', ' ') || 'AI Accident Detected'}</span>
                    <span className="text-[#BEC8D2] text-sm leading-none mt-1">10s Replay Loop active</span>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex gap-4">
                    <span className="text-[#3E4850] text-[10px] font-mono">ISO 400</span>
                    <span className="text-[#3E4850] text-[10px] font-mono">F 2.8</span>
                    <span className="text-[#3E4850] text-[10px] font-mono">SHUTTER 1/120</span>
                  </div>
                  <span className="text-[#BEC8D2] text-xs font-mono">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 pb-4 custom-scrollbar">

              {/* Incident Profile Card */}
              <div className="p-6 bg-[#171F33] rounded-lg border border-slate-700 flex flex-col gap-6 shrink-0">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[#DAE2FD] text-lg font-semibold leading-none flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-[#FFB95F]" /> Incident Profile
                    </h2>
                    <span className="text-[#BEC8D2] text-sm mt-1">Date : {formattedDate}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-orange-500/20 rounded-full border border-[#FFB95F] shadow-[0_0_15px_rgba(216,138,0,0.4)] flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#FFB95F] rounded-full animate-pulse"></div>
                    <span className="text-[#FFB95F] text-xs font-mono uppercase font-semibold">{incident.verificationStatus}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="p-4 bg-[#131B2E] rounded border border-slate-700 flex flex-col gap-1">
                    <span className="text-[#3E4850] text-[10px] font-mono uppercase leading-none">CAMERA NAME</span>
                    <span className="text-[#DAE2FD] text-base font-semibold mt-1">{incident.cctv?.name || 'Unknown Camera'}</span>
                  </div>
                  <div className="p-4 bg-[#131B2E] rounded border border-slate-700 flex flex-col gap-1">
                    <span className="text-[#3E4850] text-[10px] font-mono uppercase leading-none">COORDINATES</span>
                    <span className="text-[#DAE2FD] text-sm font-mono mt-1">{incident.cctv?.latitude || 0}° N, {incident.cctv?.longitude || 0}° E</span>
                  </div>
                  <div className="p-4 bg-[#131B2E] rounded border border-slate-700 flex flex-col gap-1">
                    <span className="text-[#3E4850] text-[10px] font-mono uppercase leading-none">CLOSEST LANDMARK</span>
                    <span className="text-[#DAE2FD] text-base mt-1">{incident.cctv?.landmark || 'N/A'}</span>
                  </div>
                </div>

                {/* Map Component */}
                <div className="h-48 relative bg-[#0B1326] rounded border border-slate-700 overflow-hidden flex justify-center items-center shrink-0 z-0">
                  {incident.cctv && (
                    <MapComponent marker={{ latitude: incident.cctv.latitude, longitude: incident.cctv.longitude }} interactive={false} />
                  )}
                </div>
              </div>

              {/* Confirm & Dispatch */}
              <div className="flex flex-col gap-3 shrink-0 mt-2">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleVerify('APPROVED')}
                  className="w-full py-5 bg-[#A40217] rounded-lg border border-red-200/20 flex justify-center items-center gap-3 hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-6 h-6 text-[#FFAEA8]" />
                  <span className="text-[#FFAEA8] text-lg font-bold uppercase tracking-wide">
                    {isSubmitting ? 'PROCESSING...' : 'CONFIRM & DISPATCH NEAREST RESCUE'}
                  </span>
                </button>

                <div className="flex gap-4">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleVerify('REJECTED')}
                    className="flex-1 py-4 bg-[#2D3449] rounded-lg border border-slate-700 flex justify-center items-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5 text-[#BEC8D2]" />
                    <span className="text-[#BEC8D2] text-base font-semibold">False Alarm</span>
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleVerify('REJECTED')}
                    className="flex-1 py-4 bg-[#2D3449] rounded-lg border border-slate-700 flex justify-center items-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 text-[#BEC8D2]" />
                    <span className="text-[#BEC8D2] text-base font-semibold">Dismiss</span>
                  </button>
                </div>

                {/* Live Queue Status */}
                <div className="p-4 bg-[#131B2E] rounded border border-slate-700 border-l-4 border-l-[#FFB95F] flex flex-col gap-2 mt-2">
                  <span className="text-[#3E4850] text-[10px] font-mono uppercase">LIVE QUEUE STATUS</span>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#FFB95F] rounded-full animate-pulse"></div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#DAE2FD] text-sm">Unit</span>
                      <span className="text-[#DAE2FD] text-sm font-mono font-bold">R-102</span>
                      <span className="text-[#DAE2FD] text-sm">is available (4.2 min ETA)</span>
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
