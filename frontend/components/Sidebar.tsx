'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutGrid, FileText, Map, Headset, Video, ShieldAlert, Users } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === 'ADMIN';

  const menuItems = [
    { name: 'Live Grid', href: '/', icon: LayoutGrid },
    { name: 'Incident Log', href: '/incident-log', icon: FileText },
    { name: 'Heatmaps', href: '/heatmaps', icon: Map },
  ];

  return (
    <aside className="w-64 h-full pt-4 pb-8 bg-[#131B2E] border-r border-[#3E4850] flex flex-col justify-between shrink-0 z-20 relative">
      <div className="px-6 pb-10 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-md flex justify-center items-center">
            <ShieldAlert className="w-6 h-6 text-[#003751]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[#DAE2FD] text-lg font-bold leading-tight">Sector 7</h2>
            <span className="text-[#BEC8D2] text-sm">Active Duty</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith('/incident/') && item.href === '/incident-log') || (pathname.startsWith('/evidence') && item.href === '/incident-log') || (pathname.startsWith('/camera') && item.href === '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 rounded flex items-center gap-3 cursor-pointer transition-colors ${isActive ? 'bg-[#A40217] hover:bg-red-800' : 'hover:bg-slate-800'
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#FFAEA8]' : 'text-[#BEC8D2]'}`} />
              <span className={`text-sm ${isActive ? 'text-[#FFAEA8] font-bold' : 'text-[#BEC8D2]'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <nav className="px-4 flex flex-col gap-2 mt-4">
        {isAdmin && (
          <>
            <Link
              href="/cctv_setting"
              className={`px-4 py-3 rounded flex items-center gap-3 cursor-pointer transition-colors ${pathname === '/cctv_setting' ? 'bg-[#A40217] hover:bg-red-800' : 'hover:bg-slate-800'
                }`}
            >
              <Video className={`w-5 h-5 ${pathname === '/cctv_setting' ? 'text-[#FFAEA8]' : 'text-[#BEC8D2]'}`} />
              <span className={`text-sm ${pathname === '/cctv_setting' ? 'text-[#FFAEA8] font-bold' : 'text-[#BEC8D2]'}`}>
                CCTV Manager
              </span>
            </Link>
            <Link
              href="/users"
              className={`px-4 py-3 rounded flex items-center gap-3 cursor-pointer transition-colors ${pathname === '/users' ? 'bg-[#A40217] hover:bg-red-800' : 'hover:bg-slate-800'
                }`}
            >
              <Users className={`w-5 h-5 ${pathname === '/users' ? 'text-[#FFAEA8]' : 'text-[#BEC8D2]'}`} />
              <span className={`text-sm ${pathname === '/users' ? 'text-[#FFAEA8] font-bold' : 'text-[#BEC8D2]'}`}>
                User Management
              </span>
            </Link>
          </>
        )}

        <Link
          href="/support"
          className={`px-4 py-3 rounded flex items-center gap-3 cursor-pointer transition-colors ${pathname === '/support' ? 'bg-[#A40217] hover:bg-red-800' : 'hover:bg-slate-800'
            }`}
        >
          <Headset className={`w-5 h-5 ${pathname === '/support' ? 'text-[#FFAEA8]' : 'text-[#BEC8D2]'}`} />
          <span className={`text-sm ${pathname === '/support' ? 'text-[#FFAEA8] font-bold' : 'text-[#BEC8D2]'}`}>
            Support
          </span>
        </Link>
      </nav>
    </aside>
  );
}
