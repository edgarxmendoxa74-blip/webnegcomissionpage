import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, User, Building2, Mail, Phone, MapPin,
  Eye, CheckCircle2, XCircle, Clock, RefreshCw, Bell,
  LayoutGrid, List,
} from 'lucide-react';
import {
  fetchPartnerApplications,
  updatePartnerApplicationStatus,
  type PartnerApplication,
} from '../lib/partners';
import { supabase } from '../lib/supabase';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type ViewMode = 'grid' | 'sheet';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300',  Icon: Clock        },
  approved: { label: 'Approved', bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300',  Icon: CheckCircle2 },
  rejected: { label: 'Rejected', bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',      Icon: XCircle      },
};

export function PartnersList() {
  const [all, setAll]                     = useState<PartnerApplication[]>([]);
  const [filtered, setFiltered]           = useState<PartnerApplication[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all');
  const [selected, setSelected]           = useState<PartnerApplication | null>(null);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [newCount, setNewCount]           = useState(0);
  const [viewMode, setViewMode]           = useState<ViewMode>('grid');

  /* ── load ── */
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPartnerApplications();
      setAll(data);
      applyFilters(data, searchQuery, statusFilter);
    } catch (err) {
      console.error('Error loading partners:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  /* ── real-time subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel('partner_applications_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_applications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as PartnerApplication;
            setAll((prev) => {
              const updated = [newRow, ...prev];
              applyFilters(updated, searchQuery, statusFilter);
              return updated;
            });
            setNewCount((n) => n + 1);
          } else if (payload.eventType === 'UPDATE') {
            setAll((prev) => {
              const updated = prev.map((p) =>
                p.id === (payload.new as PartnerApplication).id
                  ? { ...p, ...(payload.new as PartnerApplication) }
                  : p
              );
              applyFilters(updated, searchQuery, statusFilter);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [searchQuery, statusFilter]); // re-subscribe when filters change so closure is fresh

  /* ── filter helper ── */
  const applyFilters = (data: PartnerApplication[], query: string, status: StatusFilter) => {
    let f = [...data];
    if (query.trim()) {
      const q = query.toLowerCase();
      f = f.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.business_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.mobile_number.includes(q)
      );
    }
    if (status !== 'all') f = f.filter((p) => p.status === status);
    setFiltered(f);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    applyFilters(all, q, statusFilter);
  };

  const handleStatusFilter = (s: StatusFilter) => {
    setStatusFilter(s);
    applyFilters(all, searchQuery, s);
  };

  /* ── approve / reject ── */
  const handleStatusChange = async (
    id: string,
    newStatus: 'approved' | 'rejected' | 'pending'
  ) => {
    setUpdatingId(id);
    try {
      await updatePartnerApplicationStatus(id, newStatus);
      setAll((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, status: newStatus } : p
        );
        applyFilters(updated, searchQuery, statusFilter);
        // keep selected in sync
        setSelected((s) => (s?.id === id ? { ...s, status: newStatus } : s));
        return updated;
      });
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── csv export ── */
  const downloadCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Full Name','Business Name','Mobile','Email','Address','Offered Price','Markup','Status','Date Registered'];
    const rows = filtered.map((p) => [
      p.full_name, p.business_name, p.mobile_number, p.email,
      p.business_address, `₱${p.offered_price}`, `₱${p.markup}`,
      p.status || 'pending', p.created_at || '-',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `partners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  /* ── counts ── */
  const counts = {
    all:      all.length,
    pending:  all.filter((p) => p.status === 'pending').length,
    approved: all.filter((p) => p.status === 'approved').length,
    rejected: all.filter((p) => p.status === 'rejected').length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
            Registered Partners
            {counts.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-black">
                <Bell className="w-3.5 h-3.5" />
                {counts.pending} pending
              </span>
            )}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Real-time — bagong registrations ay lalabas agad dito
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setNewCount(0); load(); }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
          {newCount > 0 && (
            <span className="w-5 h-5 bg-[#E8191A] text-white text-xs font-black rounded-full flex items-center justify-center">
              {newCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={counts.all}      icon={<User className="w-5 h-5"/>}         color="blue"   />
        <StatCard label="Pending"  value={counts.pending}  icon={<Clock className="w-5 h-5"/>}       color="amber"  />
        <StatCard label="Approved" value={counts.approved} icon={<CheckCircle2 className="w-5 h-5"/>} color="green"  />
        <StatCard label="Rejected" value={counts.rejected} icon={<XCircle className="w-5 h-5"/>}      color="red"    />
      </div>

      {/* ── Search & filter bar ── */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, business, email, or mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#E8191A] text-sm"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:bg-zinc-300 text-white dark:text-zinc-900 rounded-lg font-bold text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
          {/* Grid / Sheet toggle */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('sheet')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all ${
                viewMode === 'sheet'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Sheet
            </button>
          </div>
        </div>

        {/* status pills */}
        <div className="flex flex-wrap gap-2">
          {(['all','pending','approved','rejected'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all border ${
                statusFilter === s
                  ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid / Sheet ── */}
      {isLoading ? (
        <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">Loading partners...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
          {searchQuery || statusFilter !== 'all' ? 'Walang nahanap na partner.' : 'Wala pang partner na nagsumite.'}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((partner, idx) => {
              const st = (partner.status || 'pending') as keyof typeof STATUS_CONFIG;
              const cfg = STATUS_CONFIG[st];
              const StatusIcon = cfg.Icon;

              return (
                <motion.div
                  key={partner.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border transition-shadow hover:shadow-lg ${
                    st === 'pending'
                      ? 'border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-amber-900/20'
                      : 'border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {st === 'pending' && (
                    <div className="bg-amber-500 px-4 py-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-black text-white uppercase tracking-widest">New — Awaiting Review</span>
                    </div>
                  )}

                  <div className="h-36 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center overflow-hidden">
                    {partner.profile_picture_url ? (
                      <img src={partner.profile_picture_url} alt={partner.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-14 h-14 text-zinc-400" />
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight">{partner.full_name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {partner.business_name}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /><span className="truncate">{partner.email}</span></div>
                      <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{partner.mobile_number}</div>
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{partner.business_address}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Offered</p>
                        <p className="text-sm font-black text-[#E8191A]">₱{partner.offered_price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Markup</p>
                        <p className="text-sm font-black text-green-600 dark:text-green-400">₱{partner.markup.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
                      {st !== 'approved' && (
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusChange(partner.id!, 'approved')}
                          disabled={updatingId === partner.id}
                          className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                        >✓ Approve</motion.button>
                      )}
                      {st !== 'rejected' && (
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusChange(partner.id!, 'rejected')}
                          disabled={updatingId === partner.id}
                          className="flex-1 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                        >✕ Reject</motion.button>
                      )}
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSelected(partner)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-zinc-400" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* ── SHEET VIEW ── */
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-700/50 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Address</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Offered</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Markup</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((partner, idx) => {
                    const st = (partner.status || 'pending') as keyof typeof STATUS_CONFIG;
                    const cfg = STATUS_CONFIG[st];
                    const StatusIcon = cfg.Icon;
                    return (
                      <motion.tr
                        key={partner.id || idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`border-b border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${
                          st === 'pending' ? 'bg-amber-50/40 dark:bg-amber-900/5' : ''
                        }`}
                      >
                        {/* name + photo */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
                              {partner.profile_picture_url ? (
                                <img src={partner.profile_picture_url} alt={partner.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-zinc-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black text-zinc-900 dark:text-white text-sm leading-tight">{partner.full_name}</p>
                              <p className="text-xs text-zinc-400 truncate max-w-[140px]">{partner.business_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 max-w-[160px] truncate">{partner.email}</td>
                        <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{partner.mobile_number}</td>
                        <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 max-w-[160px] truncate">{partner.business_address}</td>
                        <td className="px-4 py-3 text-right font-black text-[#E8191A] whitespace-nowrap">₱{partner.offered_price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-green-600 dark:text-green-400 whitespace-nowrap">₱{partner.markup.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {st !== 'approved' && (
                              <button onClick={() => handleStatusChange(partner.id!, 'approved')}
                                disabled={updatingId === partner.id}
                                className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs transition-all disabled:opacity-50">
                                ✓
                              </button>
                            )}
                            {st !== 'rejected' && (
                              <button onClick={() => handleStatusChange(partner.id!, 'rejected')}
                                disabled={updatingId === partner.id}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold text-xs transition-all disabled:opacity-50">
                                ✕
                              </button>
                            )}
                            <button onClick={() => setSelected(partner)}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                              <Eye className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-800 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto border border-zinc-200 dark:border-zinc-700 shadow-2xl"
            >
              {/* modal header */}
              {selected.profile_picture_url ? (
                <div className="h-48 overflow-hidden">
                  <img src={selected.profile_picture_url} alt={selected.full_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-r from-[#E8191A] to-[#c0121a] flex items-center justify-center">
                  <User className="w-10 h-10 text-white/50" />
                </div>
              )}

              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{selected.full_name}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{selected.business_name}</p>
                </div>

                {[
                  ['Email', selected.email],
                  ['Mobile', selected.mobile_number],
                  ['Address', selected.business_address],
                  ...(selected.area_coverage ? [['Area Coverage', selected.area_coverage]] : []),
                  ['Offered Price', `₱${selected.offered_price.toLocaleString()}`],
                  ['Markup', `₱${selected.markup.toLocaleString()}`],
                  ['Stamp Date', selected.stamp_date],
                  ['Registered', selected.created_at?.split('T')[0] || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-zinc-100 dark:border-zinc-700 pb-3 last:border-0">
                    <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">{label}</p>
                    <p className="text-sm text-zinc-900 dark:text-white font-semibold mt-0.5">{value}</p>
                  </div>
                ))}

                {/* status change */}
                <div className="pt-2">
                  <p className="text-xs font-bold uppercase text-zinc-400 mb-3 tracking-widest">Change Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['pending','approved','rejected'] as const).map((s) => (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStatusChange(selected.id!, s)}
                        disabled={updatingId === selected.id || selected.status === s}
                        className={`py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-40 ${
                          s === 'approved' ? 'bg-green-500 hover:bg-green-600 text-white'
                          : s === 'rejected' ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(null)}
                  className="w-full py-2.5 border-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm transition-all"
                >
                  Isara
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({
  label, value, icon, color,
}: {
  label: string; value: number; icon: React.ReactNode;
  color: 'blue' | 'amber' | 'green' | 'red';
}) {
  const colors = {
    blue:  'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red:   'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-wide">{label}</p>
      <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
