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
import { CommissionPage } from './pages/Commission';
import { MonitoringPage } from './pages/Monitoring';
import { DailyAuditPage } from './pages/DailyAuditPage';
import { ExpensesPage } from './pages/Expenses';
import { LoginPage } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
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
      case 'Commission':
        return <CommissionPage />;
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
  const [stats, setStats] = React.useState({
    closed: 0,
    totalBalance: 0,
    rawBalanceSum: 0,
    totalCommission: 0,
    manualRevenue: null as number | null,
    workers: 0,
    fullyPaid: 0,
    downpaymentOnly: 0,
    cancelled: 0
  });

  const [performanceFlow, setPerformanceFlow] = React.useState<{ label: string; count: number }[]>([]);
  const [monthlySales, setMonthlySales] = React.useState<{ label: string; value: number }[]>([]);
  const [leaders, setLeaders] = React.useState<{ name: string; deals: number; sales: number }[]>([]);
  const [grossSales, setGrossSales] = React.useState(0);
  const [fullyPaidPercentage, setFullyPaidPercentage] = React.useState(0);

  const fetchStats = async () => {
    const query = supabase.from('leads')
      .select('deal_value, down_payment, status, payment_status, worker_id, commission_rate, closed_at, created_at, month');

    if (!isOwner && profile?.id) {
      query.eq('worker_id', profile.id);
    }

    const [{ data: leads }, { data: workers }] = await Promise.all([
      query,
      supabase.from('workers').select('id, name').eq('active', true)
    ]);

    const closedLeads = leads?.filter(l => l.status === 'closed') || [];
    const rawBalanceSum = (leads as any[] | null)?.reduce((acc, lead: any) => {
      const isCancelledOrDP = lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project';
      const commission = isCancelledOrDP ? ((Number(lead.down_payment) || 0) * 0.1) : ((Number(lead.deal_value) || 0) * (lead.commission_rate || 20) / 100);

      const balance = isCancelledOrDP
        ? (Number(lead.down_payment) || 0) - commission
        : lead.payment_status === 'Fully Paid'
          ? (Number(lead.deal_value) || 0) - commission
          : (Number(lead.deal_value) || 0) - (Number(lead.down_payment) || 0);

      return acc + balance;
    }, 0) || 0;

    const totalCommission = (leads as any[] | null)?.reduce((acc, lead: any) => {
      const commission = (lead.payment_status === 'Downpayment Only' || lead.payment_status === 'Cancelled Project')
        ? ((Number(lead.down_payment) || 0) * 0.1)
        : ((Number(lead.deal_value) || 0) * (lead.commission_rate || 20) / 100);
      return acc + commission;
    }, 0) || 0;

    // Use the exact automatic calculation
    const totalBalanceToDisplay = rawBalanceSum;

    const fullyPaidCount = leads?.filter(l => l.payment_status === 'Fully Paid').length || 0;
    const downpaymentOnlyCount = leads?.filter(l => l.payment_status === 'Downpayment Only' || l.payment_status === 'Not Paid' || !l.payment_status).length || 0;
    const cancelledCount = leads?.filter(l => l.payment_status === 'Cancelled Project').length || 0;

    setStats({
      closed: closedLeads.length,
      totalBalance: totalBalanceToDisplay,
      rawBalanceSum: rawBalanceSum,
      totalCommission: totalCommission,
      manualRevenue: null, // Removed manual revenue logic entirely
      workers: workers?.length || 0,
      fullyPaid: fullyPaidCount,
      downpaymentOnly: downpaymentOnlyCount,
      cancelled: cancelledCount
    });

    const totalProjects = fullyPaidCount + downpaymentOnlyCount;
    setFullyPaidPercentage(totalProjects > 0 ? (fullyPaidCount / totalProjects) * 100 : 0);

    // Sales are counted on fully paid projects
    const paidLeads = (leads as any[] | null)?.filter(l => l.payment_status === 'Fully Paid') || [];
    setGrossSales(paidLeads.reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0));

    // Daily performance flow (last 14 days)
    const localKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const flowDays = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    setPerformanceFlow(flowDays.map(d => {
      const key = localKey(d);
      return {
        label: d.toLocaleDateString('default', { month: 'short', day: '2-digit' }),
        count: closedLeads.filter(l => l.closed_at && localKey(new Date(l.closed_at)) === key).length
      };
    }));

    // Monthly sales (last 6 months, fully paid deal value)
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
    setMonthlySales(months.map(m => ({
      label: m.toLocaleDateString('default', { month: 'short' }),
      value: paidLeads
        .filter(l => {
          const d = new Date(l.closed_at || l.created_at);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        })
        .reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0)
    })));

    // Top performers by fully paid sales
    const byWorker = new Map<string, { deals: number; sales: number }>();
    paidLeads.forEach(l => {
      if (!l.worker_id) return;
      const cur = byWorker.get(l.worker_id) || { deals: 0, sales: 0 };
      byWorker.set(l.worker_id, { deals: cur.deals + 1, sales: cur.sales + (Number(l.deal_value) || 0) });
    });
    setLeaders(
      Array.from(byWorker.entries())
        .map(([id, v]) => ({ name: workers?.find(w => w.id === id)?.name || 'Unknown', ...v }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)
    );
  };

  React.useEffect(() => {
    fetchStats();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalProjects = stats.fullyPaid + stats.downpaymentOnly;
  const strokeDasharray = `${fullyPaidPercentage} ${100 - fullyPaidPercentage}`;
  const maxFlow = Math.max(...performanceFlow.map(d => d.count), 1);
  const flowTotal = performanceFlow.reduce((acc, d) => acc + d.count, 0);
  const maxMonthly = Math.max(...monthlySales.map(m => m.value), 1);
  const avgDeal = stats.fullyPaid > 0 ? grossSales / stats.fullyPaid : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 overflow-x-hidden">
      {/* Sales Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 lg:gap-6">
        <div>
          <p className="text-[7px] lg:text-[8px] text-zinc-400 font-black uppercase tracking-[0.3em] mb-1.5 lg:mb-2">Financial Performance</p>
          <h2 className="text-lg lg:text-xl font-black tracking-tighter text-black uppercase">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex gap-2 lg:gap-3">
          <div className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-zinc-100 rounded-xl lg:rounded-2xl shadow-sm">
            <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5 lg:mb-1">Month</span>
            <span className="font-bold text-black text-[10px] lg:text-xs">{new Date().toLocaleString('default', { month: 'long' })}</span>
          </div>
          <div className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-zinc-100 rounded-xl lg:rounded-2xl shadow-sm">
            <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5 lg:mb-1">Year</span>
            <span className="font-bold text-black text-[10px] lg:text-xs">{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Gross Sales', value: `₱${grossSales.toLocaleString()}`, note: 'Fully paid deals' },
          { label: 'Commission Payable', value: `₱${stats.totalCommission.toLocaleString()}`, note: 'All employees' },
          { label: 'Avg Deal Value', value: `₱${Math.round(avgDeal).toLocaleString()}`, note: 'Per fully paid deal' },
          { label: 'Collection Rate', value: `${Math.round(fullyPaidPercentage)}%`, note: `${stats.fullyPaid} of ${totalProjects} paid` },
        ].map(k => (
          <div key={k.label} className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm">
            <p className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">{k.label}</p>
            <p className="text-base lg:text-lg font-black tracking-tighter text-black tabular-nums mt-1.5">{k.value}</p>
            <p className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-zinc-300 mt-1">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        {/* Main Stats */}
        <div className="bg-black text-white p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-2xl space-y-2 lg:space-y-3 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />

          <div className="flex items-center justify-between z-10 relative">
            <p className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] opacity-50">Total Revenue</p>
          </div>

          <div className="z-10 relative">
            <span className="text-[8px] lg:text-[10px] font-bold opacity-50 block mb-1">Total Balance</span>
            <div className="flex items-baseline gap-2">
              <p className="text-base lg:text-lg font-black tracking-tighter tabular-nums">₱{stats.totalBalance.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-zinc-400 z-10 relative mt-2">
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-green-500" />
            <span>Updates in Real-time</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm space-y-2 lg:space-y-3">
          <div className="w-7 h-7 lg:w-7 lg:h-7 bg-zinc-50 rounded-xl lg:rounded-2xl flex items-center justify-center">
            <Layers className="w-4 h-4 lg:w-4 lg:h-4 text-black" />
          </div>
          <p className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Deals Closed</p>
          <p className="text-lg lg:text-xl font-black tracking-tighter text-black tabular-nums">{stats.closed}</p>
          <div className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-zinc-300">Live Status: Active</div>
        </div>


        <div className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm space-y-2 lg:space-y-3">
          <div className="w-7 h-7 lg:w-7 lg:h-7 bg-zinc-50 rounded-xl lg:rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 lg:w-4 lg:h-4 text-black" />
          </div>
          <p className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Employees Active</p>
          <p className="text-lg lg:text-xl font-black tracking-tighter text-black tabular-nums">{stats.workers}</p>
          <div className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-zinc-300">Daily Sales Trend</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Payment Status Graph */}
        <div className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm lg:text-base font-black tracking-tighter text-black uppercase italic">Payment Status</h3>
              <p className="text-[7px] lg:text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Project Collections</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-5 lg:gap-6">
            <div className="relative w-24 h-24 lg:w-24 lg:h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  className="stroke-zinc-100"
                  strokeWidth="4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  className="stroke-black transition-all duration-1000 ease-out"
                  strokeWidth="4"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm lg:text-base font-black text-black leading-none">{Math.round(fullyPaidPercentage)}%</span>
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Paid</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 lg:space-y-4 w-full">
              <div className="p-2 lg:p-2 bg-zinc-50 rounded-xl lg:rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-black" />
                  <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-black">Fully Paid:</span>
                </div>
                <span className="text-[10px] lg:text-xs font-black text-black">{stats.fullyPaid}</span>
              </div>
              <div className="p-2 lg:p-2 bg-white border border-zinc-100 rounded-xl lg:rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-blue-500" />
                  <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-zinc-400">Downpayment Only:</span>
                </div>
                <span className="text-[10px] lg:text-xs font-black text-black">{stats.downpaymentOnly}</span>
              </div>
              <div className="p-2 lg:p-2.5 bg-zinc-50 rounded-xl lg:rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-300" />
                  <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-zinc-400">Cancelled Projects:</span>
                </div>
                <span className="text-[10px] lg:text-xs font-black text-black">{stats.cancelled}</span>
              </div>
              <div className="pt-2 px-4 lg:px-6 flex justify-between items-center">
                <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300">Total Projects:</span>
                <span className="text-[10px] lg:text-xs font-black text-black">{totalProjects}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Sales Trend Placeholder */}
        <div className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 lg:mb-0">
            <div>
              <h3 className="text-sm lg:text-base font-black tracking-tighter text-black uppercase italic">Performance Flow</h3>
              <p className="text-[7px] lg:text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Daily Conversion Trend</p>
            </div>
            <div className="w-7 h-7 lg:w-7 lg:h-7 bg-black text-white rounded-xl lg:rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 lg:w-4 lg:h-4" />
            </div>
          </div>

          <div className="h-20 flex items-end gap-1 lg:gap-1.5 px-2 lg:px-4">
            {performanceFlow.map((d, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-0.5">
                <span className="text-[7px] font-black text-zinc-400 tabular-nums">{d.count > 0 ? d.count : ''}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((d.count / maxFlow) * 100, d.count > 0 ? 8 : 3)}%` }}
                  transition={{ delay: i * 0.04, duration: 0.8 }}
                  className={`w-full rounded-t-md transition-colors hover:bg-black ${d.count > 0 ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                  title={`${d.label}: ${d.count} deal${d.count === 1 ? '' : 's'} closed`}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-black mt-3 pt-3 border-t border-zinc-50">
            <span>{performanceFlow[0]?.label}</span>
            <span>{flowTotal} closed in 14 days</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Monthly sales */}
        <div className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm lg:text-base font-black tracking-tighter text-black uppercase italic">Monthly Sales</h3>
            <p className="text-[7px] lg:text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Fully paid deal value, last 6 months</p>
          </div>
          <div className="h-28 flex items-end gap-2 lg:gap-3 px-2">
            {monthlySales.map((m, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                <span className="text-[8px] font-black text-zinc-500 tabular-nums">{m.value > 0 ? `₱${m.value.toLocaleString()}` : ''}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((m.value / maxMonthly) * 100, 3)}%` }}
                  transition={{ delay: i * 0.06, duration: 0.8 }}
                  className={`w-full rounded-t-lg ${i === monthlySales.length - 1 ? 'bg-black' : 'bg-zinc-200 hover:bg-zinc-400'} transition-colors`}
                  title={`${m.label}: ₱${m.value.toLocaleString()}`}
                />
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top performers */}
        <div className="bg-white border border-zinc-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm lg:text-base font-black tracking-tighter text-black uppercase italic">Top Performers</h3>
            <p className="text-[7px] lg:text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Ranked by fully paid sales</p>
          </div>
          {leaders.length === 0 ? (
            <p className="py-8 text-center text-[9px] font-black text-zinc-300 uppercase tracking-widest">No fully paid deals yet</p>
          ) : (
            <div className="space-y-2.5">
              {leaders.map((l, i) => (
                <div key={l.name + i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-black truncate">{i + 1}. {l.name}</span>
                    <span className="text-[9px] font-black text-zinc-500 tabular-nums">
                      {l.deals} deal{l.deals === 1 ? '' : 's'} · ₱{l.sales.toLocaleString()}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

