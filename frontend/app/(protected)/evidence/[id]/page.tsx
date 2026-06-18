'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';

interface HistoryItem {
  id: string;
  status: string;
  notes: string | null;
  changedBy: string | null;
  createdAt: string;
}

interface EvidenceIncident {
  id: string;
  detectedAt: string;
  verificationStatus: string;
  verifiedAt: string | null;
  severity: string | null;
  incidentType: string | null;
  location: string | null;
  notes: string | null;
  imageUrl: string | null;
  videoClipUrl: string | null;
  cctv: { name: string; roadSegment: string | null; accidentVideoUrl: string | null };
  verifiedByUser: { name: string | null } | null;
  resolvedByUser: { name: string | null } | null;
  history: HistoryItem[];
}

const timeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour12: false });

// Dot colour per timeline status.
const dotColor = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'PENDING') return '#FFB95F';
  if (s === 'APPROVED') return '#89CEFF';
  if (s === 'DISPATCHED') return '#FFB3AD';
  if (s === 'RESOLVED') return '#86EFAC';
  if (s === 'REJECTED') return '#BEC8D2';
  return '#89CEFF';
};

const initials = (name?: string | null) =>
  (name ?? 'System AI')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function EvidencePage() {
  const params = useParams();
  const id = params?.id as string;
  const [incident, setIncident] = useState<EvidenceIncident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/incidents/${id}`);
        if (res.ok) setIncident(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#0B1326] flex justify-center items-center text-[#BEC8D2]">
        <span className="animate-pulse">Loading evidence…</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="w-full h-screen bg-[#0B1326] flex flex-col gap-4 justify-center items-center">
        <span className="text-[#DAE2FD] text-xl">Incident not found</span>
        <Link href="/incident-log" className="px-4 py-2 bg-[#2D3449] rounded text-white hover:bg-slate-700">
          Back to Logs List
        </Link>
      </div>
    );
  }

  const videoUrl = incident.videoClipUrl || incident.cctv.accidentVideoUrl || null;
  const confirmed = incident.verificationStatus === 'APPROVED';
  const detectedDate = new Date(incident.detectedAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B1326] flex text-white font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col relative h-full pt-16">
        <TopHeader />

        <div className="w-full h-full pt-20 px-8 pb-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {/* Header & Back Link */}
          <div className="flex flex-col gap-4 shrink-0">
            <Link href="/incident-log" className="flex items-center gap-2 w-fit group">
              <div className="w-4 h-4 bg-[#89CEFF] group-hover:bg-white transition-colors"></div>
              <span className="text-[#89CEFF] text-xs font-mono font-medium tracking-wide group-hover:text-white transition-colors">
                Back to Logs List
              </span>
            </Link>

            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <h1 className="text-[#DAE2FD] text-2xl font-semibold leading-tight">
                  Log #{incident.id.slice(0, 8).toUpperCase()}
                </h1>
                <p className="text-[#BEC8D2] text-sm">
                  {incident.location || incident.cctv.roadSegment || incident.cctv.name} | {detectedDate}
                </p>
              </div>
              {incident.severity && (
                <div className="px-4 py-2 bg-[#222A3D] rounded border border-[#3E4850] flex items-center gap-3">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-wide">Priority</span>
                  <div className="px-2 py-0.5 bg-[#93000A] rounded flex items-center">
                    <span className="text-[#FFDAD6] text-[10px] font-bold">{incident.severity}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 min-h-0">
            {/* Left Column - Video Player & Details */}
            <div className="flex-[3] flex flex-col gap-4">
              {/* Video Player */}
              <div className="relative bg-[#171F33] rounded-lg border border-[#3E4850] shadow-[0_0_20px_rgba(137,206,255,0.15)] overflow-hidden aspect-video w-full flex flex-col justify-end">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    poster={incident.imageUrl || undefined}
                    controls
                    loop
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="absolute inset-0 flex justify-center items-center text-[#3E4850] text-sm font-mono">
                    No video clip available
                  </div>
                )}

                {/* Top Label */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded border border-white/20 z-10">
                  <span className="text-[#89CEFF] text-xs font-mono">
                    REC [{incident.cctv.name}] {new Date(incident.detectedAt).toLocaleString('en-GB')}
                  </span>
                </div>
              </div>

              {/* Info Bar */}
              <div className="w-full p-4 bg-[#131B2E] rounded-lg border border-[#3E4850] flex justify-between items-center shrink-0">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#BEC8D2] text-[10px] font-bold uppercase">SOURCE</span>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium">{incident.cctv.name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#BEC8D2] text-[10px] font-bold uppercase">TYPE</span>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium">
                      {incident.incidentType || 'Unclassified'}
                    </span>
                  </div>
                </div>
                {videoUrl && (
                  <a
                    href={videoUrl}
                    download
                    className="px-6 py-2.5 bg-[#2D3449] rounded border border-[#3E4850] flex items-center gap-2 hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-4 h-4 bg-[#DAE2FD]"></div>
                    <span className="text-[#DAE2FD] text-xs font-mono font-medium tracking-wide">
                      Download Video Clip
                    </span>
                  </a>
                )}
              </div>
            </div>

            {/* Right Column - Analysis & Notes */}
            <div className="flex-[1] min-w-[320px] flex flex-col gap-6">
              <div className="w-full p-6 bg-[#171F33] rounded-lg border border-[#3E4850] shadow-xl flex flex-col gap-8 h-full">
                {/* Incident Outcome */}
                <div className="flex flex-col gap-2">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">INCIDENT OUTCOME</span>
                  <div
                    className={`p-4 border-l-4 rounded-r flex items-center gap-4 ${
                      confirmed
                        ? 'bg-red-900/20 border-[#FFB4AB] shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        : 'bg-slate-800/40 border-[#BEC8D2]'
                    }`}
                  >
                    <div className={`w-5 h-5 ${confirmed ? 'bg-[#FFB4AB]' : 'bg-[#BEC8D2]'}`}></div>
                    <div className="flex flex-col">
                      <span className={`text-lg font-bold leading-tight ${confirmed ? 'text-[#FFB4AB]' : 'text-[#BEC8D2]'}`}>
                        {incident.verificationStatus}
                      </span>
                      {incident.verifiedAt && (
                        <span className="text-[#BEC8D2] text-xs mt-1">
                          {incident.verifiedByUser?.name || 'System'} at {timeOnly(incident.verifiedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Temporal Analysis (Timeline) */}
                <div className="flex flex-col gap-4">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">TEMPORAL ANALYSIS</span>
                  <div className="pl-4 relative flex flex-col gap-6">
                    <div className="absolute left-[3px] top-2 bottom-4 w-0.5 bg-[#3E4850]"></div>

                    {incident.history.length === 0 && (
                      <span className="text-[#BEC8D2] text-sm pl-6">No timeline events yet.</span>
                    )}

                    {incident.history.map(item => {
                      const color = dotColor(item.status);
                      return (
                        <div key={item.id} className="relative pl-6">
                          <div
                            className="absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-[#0B1326]"
                            style={{ backgroundColor: color, boxShadow: `0 0 0 2px ${color}4D` }}
                          ></div>
                          <div className="p-3 bg-[#222A3D] rounded border border-[#3E4850] flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase" style={{ color }}>
                                {item.status}
                              </span>
                              <span className="text-[#DAE2FD] text-xs font-mono">{timeOnly(item.createdAt)}</span>
                            </div>
                            {item.notes && <span className="text-[#DAE2FD] text-sm">{item.notes}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Command Log Notes */}
                <div className="flex flex-col gap-4 mt-auto">
                  <span className="text-[#BEC8D2] text-xs font-mono font-medium tracking-[1.2px]">COMMAND LOG NOTES</span>
                  <div className="p-4 bg-[#131B2E] rounded border border-[#3E4850] text-[#DAE2FD] text-sm leading-relaxed">
                    {incident.notes || 'No operator notes recorded for this incident.'}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-6 h-6 bg-[#0EA5E9] rounded-full flex justify-center items-center text-[#003751] text-[10px] font-bold">
                      {initials(incident.resolvedByUser?.name || incident.verifiedByUser?.name)}
                    </div>
                    <span className="text-[#BEC8D2] text-[10px] font-mono">
                      Logged by {incident.resolvedByUser?.name || incident.verifiedByUser?.name || 'System AI'}
                    </span>
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
