import React, { useState, useEffect } from 'react';
import {
    Search,
    Globe,
    Key,
    Eye,
    EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ClientStorage {
    id: string;
    client_name: string;
    business_name: string;
    website_link: string | null;
    admin_link: string | null;
    admin_email: string | null;
    admin_password: string | null;
    supabase_email: string | null;
    supabase_password: string | null;
    database_password: string | null;
    worker_id: string;
    assigned_webdev_id: string | null;
    created_at: string;
    worker?: { name: string };
    assigned_webdev?: { name: string };
}

export const ClientStorageMaster: React.FC = () => {
    const { isOwner } = useAuth();
    const [storage, setStorage] = useState<ClientStorage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOwner) {
            fetchData();
        }
    }, [isOwner]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('client_storage')
                .select('*, worker:workers!worker_id(name), assigned_webdev:workers!assigned_webdev_id(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStorage(data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };


    const filteredStorage = storage.filter(item => 
        item.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-black uppercase italic">Master Client Storage</h1>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">All client credentials and project links</p>
                </div>
                <div className="relative group w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                    <input
                        type="text"
                        placeholder="Search client/business..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Created By</th>
                                <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Client / Business</th>
                                <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Assigned WebDev</th>
                                <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Credentials / Links</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-8"><div className="h-4 bg-zinc-100 rounded-full w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredStorage.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-zinc-400 font-bold text-sm uppercase tracking-widest">
                                        No records found
                                    </td>
                                </tr>
                            ) : filteredStorage.map((item) => (
                                <tr key={item.id} className="group hover:bg-zinc-50/50 transition-all">
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-black text-black text-[10px]">
                                                {item.worker?.name?.charAt(0) || 'W'}
                                            </div>
                                            <span className="text-[10px] font-black text-black uppercase tracking-tight">
                                                {item.worker?.name || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="font-black text-xs text-black">{item.client_name}</div>
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{item.business_name}</div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                                                {item.assigned_webdev?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-3">
                                            {item.website_link && (
                                                <a href={item.website_link} target="_blank" rel="noopener noreferrer" title="Visit Website" className="p-2 bg-zinc-50 rounded-lg text-zinc-400 hover:text-black hover:bg-white border border-transparent hover:border-zinc-100 transition-all">
                                                    <Globe className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            {item.admin_password && (
                                                <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-1.5 border border-transparent hover:border-zinc-100 transition-all">
                                                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                                                    <span className="text-[9px] font-bold text-zinc-600 font-mono">
                                                        {showPasswords[item.id] ? item.admin_password : '••••••••'}
                                                    </span>
                                                    <button
                                                        onClick={() => setShowPasswords(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                        className="text-zinc-400 hover:text-black"
                                                    >
                                                        {showPasswords[item.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
