import React, { useState, useEffect } from 'react';
import { Search, Database, Globe, UserX, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StorageCard, type StorageItem } from '../components/StorageCard';

interface ClientStorage extends StorageItem {
    worker_id: string;
    assigned_webdev_id: string | null;
}

const StatTile: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
    <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}>{icon}</div>
        <div>
            <p className="text-lg font-black text-black tabular-nums leading-none">{value}</p>
            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1.5">{label}</p>
        </div>
    </div>
);

export const ClientStorageMaster: React.FC = () => {
    const { isOwner } = useAuth();
    const [storage, setStorage] = useState<ClientStorage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [creatorFilter, setCreatorFilter] = useState('all');

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

    const creators = Array.from(
        new Map(storage.map(s => [s.worker_id, s.worker?.name || 'Unknown'])).entries()
    );

    const q = searchQuery.toLowerCase();
    const filteredStorage = storage.filter(item =>
        (creatorFilter === 'all' || item.worker_id === creatorFilter) &&
        (item.client_name.toLowerCase().includes(q) || item.business_name?.toLowerCase().includes(q))
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-black tracking-tight text-black uppercase italic">Master Client Storage</h1>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">All client credentials and project links</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <select
                        title="Filter by creator"
                        value={creatorFilter}
                        onChange={(e) => setCreatorFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-zinc-100 rounded-2xl focus:border-black outline-none font-black text-[10px] uppercase tracking-widest shadow-sm"
                    >
                        <option value="all">All Employees</option>
                        {creators.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                    <div className="relative group w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                        <input
                            type="text"
                            placeholder="Search client/business..."
                            className="w-full pl-12 pr-4 py-2 bg-white border border-zinc-100 rounded-2xl focus:border-black outline-none font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Total Clients" value={storage.length} icon={<Database className="w-4 h-4 text-white" />} tone="bg-black" />
                <StatTile label="With Website" value={storage.filter(s => s.website_link).length} icon={<Globe className="w-4 h-4 text-emerald-600" />} tone="bg-emerald-50" />
                <StatTile label="Unassigned WebDev" value={storage.filter(s => !s.assigned_webdev_id).length} icon={<UserX className="w-4 h-4 text-amber-600" />} tone="bg-amber-50" />
                <StatTile label="Employees" value={creators.length} icon={<Users className="w-4 h-4 text-blue-600" />} tone="bg-blue-50" />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-white border border-zinc-100 rounded-[1.5rem] animate-pulse" />
                    ))}
                </div>
            ) : filteredStorage.length === 0 ? (
                <div className="bg-white border border-zinc-100 rounded-2xl py-12 text-center shadow-sm">
                    <Database className="w-12 h-12 mx-auto text-zinc-200 mb-4" />
                    <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">No records found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                    {filteredStorage.map(item => (
                        <StorageCard key={item.id} item={item} showCreator />
                    ))}
                </div>
            )}
        </div>
    );
};
