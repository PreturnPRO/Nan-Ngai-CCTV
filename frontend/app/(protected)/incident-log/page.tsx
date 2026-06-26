'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';
import { Search, SlidersHorizontal, Trash2 } from 'lucide-react';

interface LogData {
  id: string;
  date: string;
  cam: string;
  location: string;
  confidence: number;
  status: string;
  operator: string;
}

export default function IncidentLogPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Admin Modal States
  const [editingLog, setEditingLog] = useState<LogData | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; isBulk: boolean; id?: string }>({ isOpen: false, isBulk: false });

  useEffect(() => {
    fetchLogs();
  }, [activeTab, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/logs?status=${activeTab}&page=${page}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdate = async () => {
    if (!editingLog) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/incidents/${editingLog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', verificationStatus: editStatus })
      });
      if (res.ok) {
        toast({ title: 'Log updated successfully' });
        setEditingLog(null);
        fetchLogs();
      } else {
        toast({ title: 'Failed to update log', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error updating log', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Log deleted permanently' });
        fetchLogs();
      } else {
        toast({ title: 'Failed to delete log', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error deleting log', variant: 'destructive' });
    } finally {
      setLoading(false);
      setDeleteConfirm({ isOpen: false, isBulk: false });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/incidents/${id}`, { method: 'DELETE' })));
      toast({ title: `${selectedIds.length} logs deleted permanently` });
      setSelectedIds([]);
      fetchLogs();
    } catch (err) {
      toast({ title: 'Error deleting some logs', variant: 'destructive' });
    } finally {
      setLoading(false);
      setDeleteConfirm({ isOpen: false, isBulk: false });
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour12: false });
    return { dateStr, timeStr };
  };

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B1326] flex text-white font-sans">

      <Sidebar />

      <main className="flex-1 flex flex-col relative h-full pt-16">

        <TopHeader />

        {/* Content Wrapper */}
        <div className="w-full max-w-[1920px] mx-auto p-6 pt-20 flex flex-col gap-4 h-full overflow-hidden">
          {/* Title & Search */}
          <div className="flex justify-between items-end shrink-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#DAE2FD] text-xl font-semibold">Accident Logs Master List</h1>
              <p className="text-[#BEC8D2] text-sm">Real-time incident repository with AI-assisted verification.</p>
            </div>

            <div className="p-1 bg-[#131B2E] rounded-lg border border-[#3E4850] flex items-center gap-3">
              <div className="relative flex items-center min-w-[280px]">
                <Search className="w-4 h-4 text-[#BEC8D2] absolute left-3" />
                <input
                  type="text"
                  placeholder="Search by Camera ID or Location..."
                  className="w-full bg-transparent border-none outline-none text-[#DAE2FD] placeholder-[#88929B] py-1.5 pl-10 pr-4 text-sm"
                />
              </div>
              <button className="px-4 py-1.5 bg-[#2D3449] rounded border border-[#3E4850] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#DAE2FD]" />
                <span className="text-[#DAE2FD] text-xs font-mono font-medium tracking-wide">Filters</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#3E4850] shrink-0 mt-2">
            <div
              onClick={() => { setActiveTab('PENDING'); setPage(1); }}
              className={`px-6 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'PENDING' ? 'border-[#89CEFF] text-[#DAE2FD]' : 'border-transparent text-[#BEC8D2] opacity-70 hover:opacity-100'}`}
            >
              <span className="text-sm font-semibold">Pending</span>
              <div className="w-2 h-2 bg-[#FFB95F] rounded-full"></div>
            </div>
            <div
              onClick={() => { setActiveTab('APPROVED'); setPage(1); }}
              className={`px-6 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'APPROVED' ? 'border-[#89CEFF] text-[#DAE2FD]' : 'border-transparent text-[#BEC8D2] opacity-70 hover:opacity-100'}`}
            >
              <span className="text-sm font-semibold">Confirmed</span>
              <div className="w-2 h-2 bg-[#89CEFF] rounded-full"></div>
            </div>
            <div
              onClick={() => { setActiveTab('REJECTED'); setPage(1); }}
              className={`px-6 py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'REJECTED' ? 'border-[#89CEFF] text-[#DAE2FD]' : 'border-transparent text-[#BEC8D2] opacity-70 hover:opacity-100'}`}
            >
              <span className="text-sm font-semibold">False Alarm</span>
              <div className="w-2 h-2 bg-[#88929B] rounded-full"></div>
            </div>


            {/* Bulk Delete Button */}
            {isAdmin && selectedIds.length > 0 && (
              <div className="ml-auto flex items-center pr-4">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, isBulk: true })}
                  className="px-4 py-2 bg-[#A40217] rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg border border-red-500/50"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-bold tracking-wide">DELETE SELECTED ({selectedIds.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Table Container - adjusted for more compact look */}
          <div className="flex-1 bg-[#171F33] rounded-lg border border-[#3E4850] shadow-2xl overflow-hidden flex flex-col min-h-0">


            {/* Table Header */}
            <div className="flex items-center bg-[#222A3D] border-b border-[#3E4850] shrink-0 pr-[14px] border-l-2 border-l-transparent">
              {isAdmin && (
                <div className="flex-[0.3] px-4 py-3 flex items-center justify-center border-r border-[#3E4850]">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && selectedIds.length === logs.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(logs.map(l => l.id));
                      else setSelectedIds([]);
                    }}
                    className="w-4 h-4 cursor-pointer accent-[#89CEFF]"
                  />
                </div>
              )}
              <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Log ID</div>
              <div className="flex-[1.5] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Date & Time</div>
              <div className="flex-[2] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Camera / Location</div>
              <div className="flex-[1.5] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Confidence</div>
              <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Status</div>
              <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Operator</div>
              <div className="flex-[1] px-4 py-3 text-right text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Actions</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-32 text-[#BEC8D2]">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="flex justify-center items-center h-32 text-[#BEC8D2]">No logs found in this category.</div>
              ) : (
                logs.map((log) => {
                  const { dateStr, timeStr } = formatDate(log.date);
                  const isSelected = selectedIds.includes(log.id);
                  return (
                    <div key={log.id} className={`group flex items-center border-b border-[#3E4850]/30 hover:bg-[#222A3D]/50 transition-colors ${isSelected ? 'bg-[#222A3D]/80 border-l-2 border-l-[#89CEFF]' : 'border-l-2 border-l-transparent'}`}>
                      {isAdmin && (
                        <div className="flex-[0.3] px-4 py-3 flex items-center justify-center border-r border-[#3E4850]/30">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds(prev => [...prev, log.id]);
                              else setSelectedIds(prev => prev.filter(id => id !== log.id));
                            }}
                            className="w-4 h-4 cursor-pointer accent-[#89CEFF]"
                          />
                        </div>
                      )}
                      <div className="flex-[1] px-4 py-3 text-[#DAE2FD] text-sm font-mono font-semibold truncate">#{log.id.slice(-6)}</div>
                      <div className="flex-[1.5] px-4 py-3 text-[#DAE2FD] text-xs leading-tight">
                        {dateStr},<br />{timeStr}
                      </div>
                      <div className="flex-[2] px-4 py-3">
                        <div className="text-[#89CEFF] text-sm font-bold truncate">{log.cam}</div>
                        <div className="text-[#BEC8D2] text-[11px] mt-0.5 leading-tight truncate">{log.location}</div>
                      </div>
                      <div className="flex-[1.5] px-4 py-3 flex items-center gap-3">
                        <div className="w-16 h-1.5 bg-[#2D3449] rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-[#FFB4AB]" style={{ width: `${log.confidence}%` }}></div>
                        </div>
                        <span className="text-[#FFB4AB] text-xs font-mono">{log.confidence}%</span>
                      </div>
                      <div className="flex-[1] px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${activeTab === 'PENDING' ? 'bg-orange-950/30 border-orange-300/20 text-orange-400' : activeTab === 'APPROVED' ? 'bg-sky-950/30 border-sky-300/20 text-sky-400' : 'bg-slate-800/50 border-slate-600 text-slate-300'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'PENDING' ? 'bg-orange-400' : activeTab === 'APPROVED' ? 'bg-sky-400' : 'bg-slate-400'}`}></div>
                          <span className="text-[9px] font-bold tracking-wide uppercase">{log.status}</span>
                        </div>
                      </div>
                      <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-xs truncate">
                        {log.operator}
                      </div>
                      <div className="flex-[1] px-4 py-3 text-right flex items-center justify-end gap-2">
                        {isAdmin && (
                          <div className="flex items-center gap-1 mr-2">
                            <button
                              onClick={() => {
                                setEditingLog(log);
                                setEditStatus(log.status);
                              }}
                              className="p-1 hover:bg-slate-700 rounded text-slate-300"
                              title="Edit Status"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, isBulk: false, id: log.id })}
                              className="p-1 hover:bg-red-900/50 rounded text-red-400"
                              title="Delete Log"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                        <Link href={log.status === 'PENDING' ? `/incident/${log.id}` : `/evidence/${log.id}`}>
                          <button className="px-3 py-1.5 bg-[#0EA5E9] rounded-sm hover:bg-sky-400 transition-colors">
                            <span className="text-[#003751] text-[9px] font-bold tracking-wider leading-none block">VIEW<br />EVIDENCE</span>
                          </button>
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination / Footer */}
            <div className="px-6 py-3 bg-[#222A3D] border-t border-[#3E4850] flex justify-between items-center shrink-0">
              <span className="text-[#BEC8D2] text-[11px]">
                Showing {logs.length > 0 ? (page - 1) * 15 + 1 : 0}-{Math.min(page * 15, totalItems)} of {totalItems} total logs
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-[#131B2E] border border-[#3E4850] rounded text-xs text-white disabled:opacity-50 hover:bg-slate-700"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 bg-[#131B2E] border border-[#3E4850] rounded text-xs text-white disabled:opacity-50 hover:bg-slate-700"
                >
                  Next &rarr;
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Admin Edit Modal */}
        {editingLog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#131B2E] border border-[#3E4850] rounded-lg p-6 w-[400px] shadow-2xl">
              <h2 className="text-[#DAE2FD] text-lg font-bold mb-4">Edit Log #{editingLog.id.slice(-6)}</h2>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[#BEC8D2] text-xs font-bold mb-1 block">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full bg-[#222A3D] text-[#DAE2FD] border border-[#3E4850] rounded px-3 py-2 outline-none focus:border-[#89CEFF]"
                  >
                    <option value="PENDING">Pending (รอดำเนินการ)</option>
                    <option value="APPROVED">Confirmed (ยืนยันแล้ว)</option>
                    <option value="REJECTED">False Alarm (ระบบแจ้งเตือนผิดพลาด)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 bg-transparent text-[#BEC8D2] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminUpdate}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0EA5E9] text-[#003751] font-bold rounded hover:bg-sky-400 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deleteConfirm.isOpen && (
          <div className="absolute inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#171F33] border border-[#3E4850] rounded-xl shadow-2xl p-6 flex flex-col max-w-md w-full animate-in zoom-in-95">
              <h3 className="text-[#DAE2FD] text-xl font-bold mb-2 flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-red-500" />
                Confirm Deletion
              </h3>
              <p className="text-[#BEC8D2] text-sm mb-6">
                {deleteConfirm.isBulk
                  ? `Are you sure you want to permanently delete ${selectedIds.length} selected logs? This action cannot be undone.`
                  : `Are you sure you want to permanently delete this log? This action cannot be undone.`}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: false, isBulk: false })}
                  className="px-4 py-2 bg-[#2D3449] text-[#DAE2FD] rounded-lg hover:bg-[#3E4850] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteConfirm.isBulk ? handleBulkDelete() : handleAdminDelete(deleteConfirm.id!)}
                  disabled={loading}
                  className="px-4 py-2 bg-[#A40217] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
