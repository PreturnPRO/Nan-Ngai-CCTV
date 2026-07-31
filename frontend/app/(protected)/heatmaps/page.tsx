'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface Incident {
  id: string;
  verificationStatus: string;
  incidentType: string;
  confidenceScore: number;
  detectedAt: string;
  cctv?: {
    id: string;
    name: string;
    sector: string;
    landmark: string;
    latitude: number;
    longitude: number;
  };
}

export default function HeatmapsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState<'Today' | '7 Days' | '30 Days' | 'All Time'>('30 Days');
  const [timePeriod, setTimePeriod] = useState<'All' | 'Daytime' | 'Nighttime'>('All');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incidents?status=CONFIRMED');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Data
  const filteredIncidents = useMemo(() => {
    const now = new Date();
    return incidents.filter(inc => {
      const incDate = new Date(inc.detectedAt);
      
      // Date Range Filter
      let dateMatch = true;
      if (dateRange === 'Today') {
        dateMatch = incDate.toDateString() === now.toDateString();
      } else if (dateRange === '7 Days') {
        const diffTime = Math.abs(now.getTime() - incDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        dateMatch = diffDays <= 7;
      } else if (dateRange === '30 Days') {
        const diffTime = Math.abs(now.getTime() - incDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        dateMatch = diffDays <= 30;
      }

      // Time Period Filter
      let timeMatch = true;
      const hour = incDate.getHours();
      if (timePeriod === 'Daytime') {
        timeMatch = hour >= 6 && hour < 18;
      } else if (timePeriod === 'Nighttime') {
        timeMatch = hour >= 18 || hour < 6;
      }

      return dateMatch && timeMatch;
    });
  }, [incidents, dateRange, timePeriod]);

  // Aggregations
  // 1. Hotspots by CCTV
  const hotspots = useMemo(() => {
    const counts: Record<string, { name: string, sector: string, count: number, latitude: number, longitude: number }> = {};
    filteredIncidents.forEach(inc => {
      if (!inc.cctv) return;
      if (!counts[inc.cctv.id]) {
        counts[inc.cctv.id] = { name: inc.cctv.name, sector: inc.cctv.sector || 'Unknown Sector', count: 0, latitude: inc.cctv.latitude, longitude: inc.cctv.longitude };
      }
      counts[inc.cctv.id].count += 1;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredIncidents]);

  // 2. Hourly Distribution
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- computed for an upcoming hourly chart
  const hourlyData = useMemo(() => {
    const hours = new Array(24).fill(0);
    filteredIncidents.forEach(inc => {
      const h = new Date(inc.detectedAt).getHours();
      hours[h] += 1;
    });
    const max = Math.max(...hours, 1); // prevent division by zero
    return hours.map(count => ({ count, heightPercentage: (count / max) * 100 }));
  }, [filteredIncidents]);

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0b1326] flex text-[#dae2fd] font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col relative h-full pt-16 bg-[#0b1326]">
        <TopHeader />

        {/* Filter Bar */}
        <div className="h-14 border-b border-[#3e4850] flex items-center px-6 gap-6 bg-[#060e20]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-wider text-[#bec8d2] uppercase font-semibold">Date Range</span>
            <select 
              value={dateRange}
              onChange={e => setDateRange(e.target.value as 'Today' | '7 Days' | '30 Days' | 'All Time')}
              className="bg-[#2d3449] text-[#dae2fd] text-xs rounded border border-[#88929b] px-2 py-1 outline-none"
            >
              <option>Today</option>
              <option>7 Days</option>
              <option>30 Days</option>
              <option>All Time</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border-l border-[#3e4850] pl-6">
            <span className="text-xs tracking-wider text-[#bec8d2] uppercase font-semibold">Time Period</span>
            <select 
              value={timePeriod}
              onChange={e => setTimePeriod(e.target.value as 'All' | 'Daytime' | 'Nighttime')}
              className="bg-[#2d3449] text-[#dae2fd] text-xs rounded border border-[#88929b] px-2 py-1 outline-none"
            >
              <option>All</option>
              <option>Daytime</option>
              <option>Nighttime</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#222a3d] rounded border border-[#3e4850]">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              <span className="text-[10px] tracking-wider uppercase font-semibold">High Risk Zone</span>
            </div>
            <button className="text-[#bec8d2] hover:text-white transition-colors">
               <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        {/* Dashboard Layout Split */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Map Section (70%) */}
          <div className="relative flex-[7] bg-[#020617] overflow-hidden group border-r border-[#3e4850]">
            <MapComponent heatspots={hotspots.map(hs => ({ latitude: hs.latitude, longitude: hs.longitude, intensity: hs.count }))} />
            
            {/* Live Data Map Overlay Simulation */}
            <div className="absolute inset-0 z-10 pointer-events-none">
            </div>

            <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
              <div className="bg-[#131b2e]/90 border border-[#3e4850] p-4 rounded backdrop-blur-md">
                <h4 className="text-[10px] uppercase tracking-wider mb-3 opacity-70 font-semibold">INTENSITY LEGEND</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
                    <span className="text-xs font-medium">Critical (&gt;40)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]"></div>
                    <span className="text-xs font-medium">Moderate (20-40)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>
                    <span className="text-xs font-medium">Elevated (10-20)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Panel (30%) */}
          <div className="flex-[3] bg-[#171f33] overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            <div className="bg-[#222a3d] border border-[#3e4850] rounded-xl p-5 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[16px] font-bold">High-Risk Hotspots</h3>
                <span className="material-symbols-outlined text-sm text-[#bec8d2]">warning</span>
              </div>
              <div className="space-y-3">
                {hotspots.length === 0 ? (
                  <div className="text-center text-sm text-[#bec8d2] py-4">No data available</div>
                ) : (
                  hotspots.map((hs, i) => {
                    let colorClass = "border-red-500 bg-[#2d3449]";
                    let numColor = "text-red-400";
                    if (i > 0 && i <= 2) { colorClass = "border-orange-500/70 bg-[#2d3449]/60"; numColor = "text-orange-400"; }
                    if (i > 2) { colorClass = "border-yellow-500/40 bg-[#2d3449]/60"; numColor = "text-yellow-400"; }

                    return (
                      <div key={i} className={`flex items-center justify-between p-2 rounded border-l-4 ${colorClass}`}>
                        <div>
                          <div className="text-xs font-bold">{hs.name}</div>
                          <div className="text-[10px] text-[#bec8d2]">Area: {hs.sector}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold font-mono ${numColor}`}>{hs.count}</div>
                          <div className="text-[10px] text-[#bec8d2]">Cases</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Accidents by Time of Day */}
          </div>
        </div>
      </main>
    </div>
  );
}
