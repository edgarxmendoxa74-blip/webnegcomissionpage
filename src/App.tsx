import React from 'react';
import {
  TrendingUp,
  Layers
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { LogoMark } from './components/Logo';
import { WorkersPage } from './pages/Workers';
import { LeadsTracker } from './pages/LeadsTracker';
import { ReceiptsPage } from './pages/Receipts';
import { MonitoringPage } from './pages/Monitoring';
import { DailyAuditPage } from './pages/DailyAuditPage';
import { ExpensesPage } from './pages/Expenses';
import { LoginPage } from './pages/Login';
import { ApplicantsPage } from './pages/ApplicantsPage';
import { TrainingVideoManager } from './components/TrainingVideoManager';
import { ApplicantPortal } from './pages/ApplicantPortal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { PartnerProgram } from './pages/PartnerProgram';
import { PartnerAdmin } from './pages/PartnerAdmin';
import { PartnersList } from './pages/PartnersList';
import { CertificateGenerator } from './pages/CertificateGenerator';
import { motion, AnimatePresence } from 'framer-motion';

function AppContent() {
  const { user, loading, isOwner } = useAuth();
  const [activeTab, setActiveTab] = React.useState('Master List');

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <LogoMark className="h-20 w-auto text-ink animate-pulse" />
        <span className="text-xl font-extrabold tracking-tight text-ink">WebNegosyo</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Employees see a dedicated dashboard: no sidebar, no admin tabs
  if (!isOwner) {
    return <EmployeeDashboard />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Sales':
        return <Dashboard />;
      case 'Manage Team':
        return <WorkersPage />;
      case 'Applicants':
        return <ApplicantsPage />;
      case 'Training Videos':
        return <TrainingVideoManager isOpen={true} isPageSection={true} onClose={() => setActiveTab('Applicants')} />;
      case 'Monitoring':
        return <MonitoringPage />;
      case 'Daily Audit':
        return <DailyAuditPage />;
      case 'Expenses':
        return <ExpensesPage />;
      case 'Receipts':
        return <ReceiptsPage />;
      case 'Master List':
        return <LeadsTracker />;
      case 'Partners':
        return <PartnersList />;
      case 'Certificate':
        return <CertificateGenerator />;
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground text-center">
            <div className="bg-accent/50 p-6 rounded-full mb-4">
              <span className="text-4xl" role="img" aria-label="Under Construction">ðŸš§</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Page Under Construction</h2>
            <p className="max-w-xs">We're working hard to bring the {activeTab} feature to life!</p>
          </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

const Dashboard = () => {
  const { profile, isOwner } = useAuth();
  type Period = 'day' | 'week' | 'month' | 'year';
  const [period, setPeriod] = React.useState<Period>('month');

  const [allLeads, setAllLeads] = React.useState<any[]>([]);
  const [workers, setWorkers] = React.useState<{ id: string; name: string }[]>([]);
  const [_loading, setLoading] = React.useState(true);

  const fetchData = async () => {
    setLoading(true);
    const query = supabase.from('leads')
      .select('deal_value, down_payment, status, payment_status, worker_id, commission_rate, closed_at, created_at, month');
    if (!isOwner && profile?.id) query.eq('worker_id', profile.id);

    const [{ data: leads }, { data: ws }] = await Promise.all([
      query,
      supabase.from('workers').select('id, name').eq('active', true)
    ]);
    setAllLeads((leads as any[]) || []);
    setWorkers((ws as any[]) || []);
    setLoading(false);
  };

  React.useEffect(() => {
    fetchData();
    const channel = supabase.channel('dashboard-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── helpers ──────────────────────────────────────────────────────────────
  const localKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const isoWeek = (d: Date) => {
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const diff = d.getTime() - jan4.getTime();
    return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
  };

  const paidLeads = allLeads.filter(l => l.payment_status === 'Fully Paid');
  const closedLeads = allLeads.filter(l => l.status === 'closed');

  // Commission of a single lead
  const leadCommission = (l: any) => {
    const isDP = l.payment_status === 'Downpayment Only' || l.payment_status === 'Cancelled Project';
    return isDP
      ? (Number(l.down_payment) || 0) * 0.1
      : (Number(l.deal_value) || 0) * ((l.commission_rate || 20) / 100);
  };

  // ── period-specific bar chart data ──────────────────────────────────────
  const chartData = React.useMemo(() => {
    const now = new Date();
    if (period === 'day') {
      // Last 14 days
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        const key = localKey(d);
        const dayPaid = paidLeads.filter(l => l.closed_at && localKey(new Date(l.closed_at)) === key);
        const dayClosed = closedLeads.filter(l => l.closed_at && localKey(new Date(l.closed_at)) === key);
        return {
          label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
          deals: dayClosed.length,
          sales: dayPaid.reduce((s, l) => s + (Number(l.deal_value) || 0), 0),
        };
      });
    }
    if (period === 'week') {
      // Last 8 weeks
      return Array.from({ length: 8 }, (_, i) => {
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (7 - i) * 7 + 7);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
        const wn = isoWeek(weekStart);
        const weekPaid = paidLeads.filter(l => {
          if (!l.closed_at) return false;
          const d = new Date(l.closed_at);
          return d >= weekStart && d <= weekEnd;
        });
        const weekClosed = closedLeads.filter(l => {
          if (!l.closed_at) return false;
          const d = new Date(l.closed_at);
          return d >= weekStart && d <= weekEnd;
        });
        return {
          label: `W${wn}`,
          sublabel: weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
          deals: weekClosed.length,
          sales: weekPaid.reduce((s, l) => s + (Number(l.deal_value) || 0), 0),
        };
      });
    }
    if (period === 'month') {
      // Last 12 months
      return Array.from({ length: 12 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const monthPaid = paidLeads.filter(l => {
          const d = new Date(l.closed_at || l.created_at);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        });
        const monthClosed = closedLeads.filter(l => {
          const d = new Date(l.closed_at || l.created_at);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        });
        return {
          label: m.toLocaleDateString('default', { month: 'short' }),
          sublabel: String(m.getFullYear()),
          deals: monthClosed.length,
          sales: monthPaid.reduce((s, l) => s + (Number(l.deal_value) || 0), 0),
        };
      });
    }
    // year — last 4 years
    return Array.from({ length: 4 }, (_, i) => {
      const yr = now.getFullYear() - (3 - i);
      const yrPaid = paidLeads.filter(l => new Date(l.closed_at || l.created_at).getFullYear() === yr);
      const yrClosed = closedLeads.filter(l => new Date(l.closed_at || l.created_at).getFullYear() === yr);
      return {
        label: String(yr),
        deals: yrClosed.length,
        sales: yrPaid.reduce((s, l) => s + (Number(l.deal_value) || 0), 0),
      };
    });
  }, [allLeads, period]);

  // ── summary stats for the CURRENT period slot (last item = current) ──────
  const currentSlot = chartData[chartData.length - 1];
  const prevSlot = chartData[chartData.length - 2];
  const dealsDelta = currentSlot.deals - (prevSlot?.deals || 0);

  // ── all-time aggregates ───────────────────────────────────────────────────
  const totalGrossSales = paidLeads.reduce((s, l) => s + (Number(l.deal_value) || 0), 0);
  const totalCommission = allLeads.reduce((s, l) => s + leadCommission(l), 0);
  const fullyPaidCount = allLeads.filter(l => l.payment_status === 'Fully Paid').length;
  const dpOnlyCount = allLeads.filter(l => l.payment_status === 'Downpayment Only' || l.payment_status === 'Not Paid' || !l.payment_status).length;
  const cancelledCount = allLeads.filter(l => l.payment_status === 'Cancelled Project').length;
  const totalProjects = fullyPaidCount + dpOnlyCount;
  const fullyPaidPct = totalProjects > 0 ? (fullyPaidCount / totalProjects) * 100 : 0;
  const avgDeal = fullyPaidCount > 0 ? totalGrossSales / fullyPaidCount : 0;
  const totalBalance = allLeads.reduce((acc, l) => {
    const isDP = l.payment_status === 'Downpayment Only' || l.payment_status === 'Cancelled Project';
    const comm = leadCommission(l);
    const bal = isDP
      ? (Number(l.down_payment) || 0) - comm
      : l.payment_status === 'Fully Paid'
        ? (Number(l.deal_value) || 0) - comm
        : (Number(l.deal_value) || 0) - (Number(l.down_payment) || 0);
    return acc + bal;
  }, 0);

  // top performers
  const byWorker = new Map<string, { deals: number; sales: number }>();
  paidLeads.forEach(l => {
    if (!l.worker_id) return;
    const cur = byWorker.get(l.worker_id) || { deals: 0, sales: 0 };
    byWorker.set(l.worker_id, { deals: cur.deals + 1, sales: cur.sales + (Number(l.deal_value) || 0) });
  });
  const leaders = Array.from(byWorker.entries())
    .map(([id, v]) => ({ name: workers.find(w => w.id === id)?.name || 'Unknown', ...v }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const maxSales = Math.max(...chartData.map(d => d.sales), 1);
  const maxDeals = Math.max(...chartData.map(d => d.deals), 1);
  const strokeDasharray = `${fullyPaidPct} ${100 - fullyPaidPct}`;

  const periodLabels: Record<Period, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 overflow-x-hidden">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.3em]">Financial Performance</p>
          <h2 className="text-xl font-black tracking-tight text-black uppercase mt-0.5">Sales Analytics</h2>
        </div>
        {/* Period switcher */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl self-start sm:self-auto">
          {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${period === p ? 'bg-black text-white shadow-sm' : 'text-zinc-500 hover:text-black'}`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Gross Sales', value: `₱${totalGrossSales.toLocaleString()}`, note: 'Fully paid deals' },
          { label: 'Commission Payable', value: `₱${Math.round(totalCommission).toLocaleString()}`, note: 'All employees' },
          { label: 'Avg Deal Value', value: `₱${Math.round(avgDeal).toLocaleString()}`, note: 'Per fully paid deal' },
          { label: 'Collection Rate', value: `${Math.round(fullyPaidPct)}%`, note: `${fullyPaidCount} of ${totalProjects} paid` },
        ].map(k => (
          <div key={k.label} className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-2xl shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">{k.label}</p>
            <p className="text-lg font-black tracking-tight text-black tabular-nums mt-1">{k.value}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-300 mt-0.5">{k.note}</p>
          </div>
        ))}
      </div>

      {/* ── Period analytics: deals closed + sales earned ── */}
      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-4 lg:p-5 space-y-5">
        {/* period header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-black">{periodLabels[period]} Performance</h3>
            <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              Deals closed &amp; sales earned per {period}
            </p>
          </div>
          {/* current-period callout */}
          <div className="flex gap-3">
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                This {period === 'day' ? 'day' : period === 'week' ? 'week' : period === 'month' ? 'month' : 'year'}
              </p>
              <p className="text-lg font-black tabular-nums text-black leading-tight">{currentSlot.deals} closed</p>
              <p className="text-xs font-bold text-zinc-500 tabular-nums">₱{currentSlot.sales.toLocaleString()}</p>
              {prevSlot && (
                <p className={`text-[9px] font-bold mt-0.5 ${dealsDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {dealsDelta >= 0 ? '▲' : '▼'} {Math.abs(dealsDelta)} vs prev {period}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sales bar chart */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Sales (₱) per {period}</p>
          <div className="h-32 flex items-end gap-1 sm:gap-1.5">
            {chartData.map((d, i) => {
              const isLast = i === chartData.length - 1;
              return (
                <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-0.5 group relative">
                  {d.sales > 0 && (
                    <span className="text-[6px] sm:text-[7px] font-black text-zinc-400 tabular-nums text-center leading-none">
                      ₱{d.sales >= 1000 ? `${(d.sales / 1000).toFixed(0)}k` : d.sales}
                    </span>
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.sales / maxSales) * 100, d.sales > 0 ? 6 : 2)}%` }}
                    transition={{ delay: i * 0.03, duration: 0.6 }}
                    className={`w-full rounded-t-md transition-colors ${isLast ? 'bg-black' : 'bg-zinc-200 group-hover:bg-zinc-400'}`}
                    title={`${d.label}: ₱${d.sales.toLocaleString()}`}
                  />
                  <span className={`text-[7px] font-bold text-center truncate w-full ${isLast ? 'text-black font-black' : 'text-zinc-400'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deals bar chart */}
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2">Deals closed per {period}</p>
          <div className="h-20 flex items-end gap-1 sm:gap-1.5">
            {chartData.map((d, i) => {
              const isLast = i === chartData.length - 1;
              return (
                <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-0.5 group">
                  {d.deals > 0 && (
                    <span className="text-[7px] font-black text-zinc-500 tabular-nums">{d.deals}</span>
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.deals / maxDeals) * 100, d.deals > 0 ? 10 : 2)}%` }}
                    transition={{ delay: i * 0.03, duration: 0.6 }}
                    className={`w-full rounded-t-md transition-colors ${isLast ? 'bg-zinc-800' : 'bg-zinc-100 group-hover:bg-zinc-300'}`}
                    title={`${d.label}: ${d.deals} deal${d.deals !== 1 ? 's' : ''}`}
                  />
                </div>
              );
            })}
          </div>
          {/* x-axis labels for deals chart */}
          <div className="flex gap-1 sm:gap-1.5 mt-1">
            {chartData.map((d, i) => (
              <span key={i} className={`flex-1 text-[7px] font-bold text-center truncate ${i === chartData.length - 1 ? 'text-black font-black' : 'text-zinc-300'}`}>
                {'sublabel' in d ? (d as any).sublabel : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: balance / deals / workers + payment status + performers ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-black text-white p-4 rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50 relative z-10">Total Revenue</p>
          <p className="text-xl font-black tracking-tight tabular-nums relative z-10">₱{totalBalance.toLocaleString()}</p>
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-zinc-400 relative z-10">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Real-time balance
          </div>
        </div>
        <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="w-7 h-7 bg-zinc-50 rounded-xl flex items-center justify-center">
            <Layers className="w-4 h-4 text-black" />
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Total Deals Closed</p>
          <p className="text-xl font-black tracking-tight text-black tabular-nums">{closedLeads.length}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-300">All time</p>
        </div>
        <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="w-7 h-7 bg-zinc-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Active Employees</p>
          <p className="text-xl font-black tracking-tight text-black tabular-nums">{workers.length}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-300">Currently active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Payment status donut */}
        <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-tight text-black">Payment Status</h3>
          <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 mb-4">Project collections</p>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-100" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-black transition-all duration-1000" strokeWidth="4" strokeDasharray={strokeDasharray} strokeDashoffset="0" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-black">{Math.round(fullyPaidPct)}%</span>
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Paid</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {[
                { dot: 'bg-black', label: 'Fully Paid', count: fullyPaidCount },
                { dot: 'bg-blue-500', label: 'Downpayment Only', count: dpOnlyCount },
                { dot: 'bg-zinc-300', label: 'Cancelled', count: cancelledCount },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between p-2 bg-zinc-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${row.dot}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{row.label}</span>
                  </div>
                  <span className="text-xs font-black text-black tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top performers */}
        <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-tight text-black">Top Performers</h3>
          <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 mb-4">Ranked by fully paid sales</p>
          {leaders.length === 0 ? (
            <p className="py-8 text-center text-[9px] font-black text-zinc-300 uppercase tracking-widest">No fully paid deals yet</p>
          ) : (
            <div className="space-y-3">
              {leaders.map((l, i) => (
                <div key={l.name + i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-black truncate">{i + 1}. {l.name}</span>
                    <span className="text-[9px] font-black text-zinc-500 tabular-nums">
                      {l.deals} deal{l.deals !== 1 ? 's' : ''} · ₱{l.sales.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(l.sales / (leaders[0].sales || 1)) * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-black rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const isHiringPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/hiring' ||
    path === '/hiring/' ||
    path.startsWith('/hiring/') ||
    hash === '#/hiring' ||
    hash === '#hiring' ||
    search.includes('portal=hiring') ||
    search.includes('hiring')
  );
};

const isPartnerPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path === '/partners' ||
    path === '/partners/' ||
    path.startsWith('/partners/') ||
    hash === '#/partners' ||
    hash === '#partners'
  );
};

const isPartnerAdminPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path === '/partners/admin' ||
    path === '/partners/admin/' ||
    hash === '#/partners/admin' ||
    hash === '#partners/admin'
  );
};

function App() {
  const [isHiring, setIsHiring] = React.useState(() => isHiringPath());
  const [isPartner, setIsPartner] = React.useState(() => isPartnerPath());
  const [isPartnerAdmin, setIsPartnerAdmin] = React.useState(() => isPartnerAdminPath());

  React.useEffect(() => {
    const handleLocationChange = () => {
      setIsHiring(isHiringPath());
      setIsPartner(isPartnerPath());
      setIsPartnerAdmin(isPartnerAdminPath());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

if (isPartnerAdmin) {
    return <PartnerAdmin />;
  }

  if (isPartner) {
    return <PartnerProgram />;
  }

  if (isHiring) {
    return <ApplicantPortal />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

