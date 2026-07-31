'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CCTVTable } from '@/components/cctv/CCTVTable';
import { Loader2 } from 'lucide-react';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';

export default function CCTVSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  if (!mounted || status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'ADMIN')) {
    return (
      <div suppressHydrationWarning className="w-full h-screen bg-[#0B1326] flex justify-center items-center">
        {mounted && <Loader2 className="animate-spin text-[#89CEFF] w-8 h-8" />}
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B1326] flex text-white font-sans">

      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full pt-16">

        <TopHeader title="TRAFFIC COMMAND" />

        {/* Content Wrapper */}
        <div className="w-full max-w-[1920px] mx-auto p-8 pt-24 flex flex-col gap-6 h-full overflow-hidden">

          {/* Title */}
          <div className="flex justify-between items-end shrink-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#DAE2FD] text-2xl font-semibold">CCTV Management System</h1>
              <p className="text-[#BEC8D2] text-base">Add, update, or remove camera feeds from the system.</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-[#171F33] rounded-lg border border-[#3E4850] shadow-2xl overflow-hidden flex flex-col min-h-0 text-white">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <CCTVTable />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
