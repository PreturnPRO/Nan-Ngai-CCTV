'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast({ title: 'Error fetching users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentUser({ name: '', email: '', role: 'USER' });
    setPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditing(true);
    setCurrentUser(user);
    setPassword(''); // leave blank to not change
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'User deleted' });
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error deleting user', variant: 'destructive' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const url = isEditing ? `/api/users/${currentUser.id}` : '/api/users';
    const method = isEditing ? 'PATCH' : 'POST';
    
    const body: { name?: string | null; email?: string; role?: string; password?: string } = {
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    };
    if (password) body.password = password;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: isEditing ? 'User updated' : 'User created' });
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error saving user', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'ADMIN')) {
    return (
      <div className="w-full h-screen bg-[#0B1326] flex justify-center items-center">
        <Loader2 className="animate-spin text-[#89CEFF] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0B1326] flex text-white font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col relative h-full pt-16">
        <TopHeader />
        
        {/* Content Wrapper */}
        <div className="w-full max-w-[1920px] mx-auto p-6 pt-20 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* Title & Action */}
          <div className="flex justify-between items-end shrink-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-[#DAE2FD] text-xl font-semibold">User Management</h1>
              <p className="text-[#BEC8D2] text-sm">Manage administrators and system operators.</p>
            </div>
            
            <button 
              onClick={openAddModal}
              className="px-4 py-2 bg-[#0EA5E9] rounded text-[#003751] font-bold text-sm flex items-center gap-2 hover:bg-sky-400 transition-colors"
            >
              + ADD NEW USER
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-[#171F33] rounded-lg border border-[#3E4850] shadow-2xl overflow-hidden flex flex-col min-h-0">
            
            {/* Table Header */}
            <div className="flex items-center bg-[#222A3D] border-b border-[#3E4850] shrink-0">
              <div className="flex-[2] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Name</div>
              <div className="flex-[2] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Email</div>
              <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Role</div>
              <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Created</div>
              <div className="flex-[1] px-4 py-3 text-right text-[#BEC8D2] text-[11px] font-mono font-medium tracking-wide">Actions</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-32 text-[#BEC8D2]">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="flex justify-center items-center h-32 text-[#BEC8D2]">No users found.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="group flex items-center border-b border-[#3E4850]/30 hover:bg-[#222A3D]/50 transition-colors">
                    <div className="flex-[2] px-4 py-3 text-[#DAE2FD] text-sm font-semibold truncate">{user.name || '-'}</div>
                    <div className="flex-[2] px-4 py-3 text-[#BEC8D2] text-sm truncate">{user.email}</div>
                    <div className="flex-[1] px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${user.role === 'ADMIN' ? 'bg-sky-950/30 border-sky-300/20 text-sky-400' : 'bg-slate-800/50 border-slate-600 text-slate-300'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.role === 'ADMIN' ? 'bg-sky-400' : 'bg-slate-400'}`}></div>
                        <span className="text-[9px] font-bold tracking-wide uppercase">{user.role}</span>
                      </div>
                    </div>
                    <div className="flex-[1] px-4 py-3 text-[#BEC8D2] text-xs font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex-[1] px-4 py-3 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === session?.user?.id}
                        className="p-1.5 hover:bg-red-900/50 rounded text-red-400 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>

        {/* Custom Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#131B2E] border border-[#3E4850] rounded-lg p-6 w-[400px] shadow-2xl">
              <h2 className="text-[#DAE2FD] text-lg font-bold mb-1">
                {isEditing ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-[#BEC8D2] text-xs mb-6">
                {isEditing ? 'Update the details for this user.' : 'Create a new operator or admin account.'}
              </p>
              
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div>
                  <label className="text-[#BEC8D2] text-xs font-bold mb-1 block">Name</label>
                  <input 
                    value={currentUser.name || ''}
                    onChange={e => setCurrentUser({...currentUser, name: e.target.value})}
                    className="w-full bg-[#222A3D] text-[#DAE2FD] border border-[#3E4850] rounded px-3 py-2 outline-none focus:border-[#89CEFF] text-sm"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="text-[#BEC8D2] text-xs font-bold mb-1 block">Email</label>
                  <input 
                    type="email"
                    required
                    value={currentUser.email || ''}
                    onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                    className="w-full bg-[#222A3D] text-[#DAE2FD] border border-[#3E4850] rounded px-3 py-2 outline-none focus:border-[#89CEFF] text-sm"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-[#BEC8D2] text-xs font-bold mb-1 block">
                    {isEditing ? 'New Password (leave blank to keep)' : 'Password'}
                  </label>
                  <input 
                    type="password"
                    required={!isEditing}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#222A3D] text-[#DAE2FD] border border-[#3E4850] rounded px-3 py-2 outline-none focus:border-[#89CEFF] text-sm"
                    placeholder="********"
                  />
                </div>
                <div>
                  <label className="text-[#BEC8D2] text-xs font-bold mb-1 block">Role</label>
                  <select 
                    value={currentUser.role || 'USER'}
                    onChange={e => setCurrentUser({...currentUser, role: e.target.value})}
                    className="w-full bg-[#222A3D] text-[#DAE2FD] border border-[#3E4850] rounded px-3 py-2 outline-none focus:border-[#89CEFF] text-sm"
                  >
                    <option value="USER">User (Operator)</option>
                    <option value="ADMIN">Admin (Manager)</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-transparent text-[#BEC8D2] text-sm hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#0EA5E9] text-[#003751] text-sm font-bold rounded hover:bg-sky-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {saving ? 'Saving...' : 'Save User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
