'use client';
import React from 'react';
import { TopHeader } from '@/components/TopHeader';
import { Sidebar } from '@/components/Sidebar';

export default function SupportPage() {
  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B1326] flex text-white font-sans">
      
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full pt-16">
        
        <TopHeader title="TRAFFIC COMMAND / SUPPORT" />

        {/* Content Wrapper */}
        <div className="w-full max-w-4xl mx-auto p-8 pt-32 flex flex-col gap-6 h-full overflow-hidden">
          
          <div className="flex flex-col gap-2">
            <h1 className="text-[#DAE2FD] text-3xl font-bold">Support & Contact</h1>
            <p className="text-[#BEC8D2] text-base">If you are experiencing issues with the Traffic Command System, please reach out to the administrative or development team.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            
            {/* Developer Contact Card */}
            <div className="bg-[#171F33] p-8 rounded-lg border border-[#3E4850] flex flex-col gap-4">
              <div className="w-12 h-12 bg-sky-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👨‍💻</span>
              </div>
              <div>
                <h2 className="text-[#DAE2FD] text-xl font-bold">System Developer</h2>
                <p className="text-[#88929B] text-sm mt-1">For technical issues, bugs, and system integrations.</p>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-[#3E4850] pt-4">
                <div className="flex items-center gap-3">
                  <span className="text-[#BEC8D2] text-sm w-16">Email:</span>
                  <a href="mailto:vism06@gmail.com" className="text-[#89CEFF] hover:underline">vism06@gmail.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#BEC8D2] text-sm w-16">Status:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-400 text-sm">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Contact Card */}
            <div className="bg-[#171F33] p-8 rounded-lg border border-[#3E4850] flex flex-col gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <h2 className="text-[#DAE2FD] text-xl font-bold">System Administrator</h2>
                <p className="text-[#88929B] text-sm mt-1">For user access, permissions, and operational issues.</p>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-[#3E4850] pt-4">
                <div className="flex items-center gap-3">
                  <span className="text-[#BEC8D2] text-sm w-16">Email:</span>
                  <a href="mailto:admin@example.com" className="text-[#89CEFF] hover:underline">admin@example.com</a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#BEC8D2] text-sm w-16">Status:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-400 text-sm">On Duty</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 p-6 bg-[#060E20] border border-[#3E4850] rounded-lg">
            <h3 className="text-[#DAE2FD] font-semibold mb-2">Frequently Asked Questions</h3>
            <div className="flex flex-col gap-4 mt-4">
              <div>
                <h4 className="text-[#89CEFF] text-sm font-bold">Q: How do I request access to CCTV Manager?</h4>
                <p className="text-[#BEC8D2] text-sm mt-1">A: Only users with the ADMIN role can access the CCTV Manager. Contact the System Administrator to request an access upgrade.</p>
              </div>
              <div>
                <h4 className="text-[#89CEFF] text-sm font-bold">Q: What should I do if a live feed goes down?</h4>
                <p className="text-[#BEC8D2] text-sm mt-1">A: The system will automatically attempt to reconnect. If it remains down for more than 5 minutes, please report it to the technical team.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
