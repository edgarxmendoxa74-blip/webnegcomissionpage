import React from 'react';
import {
  TrendingUp,
  Layers
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { WorkersPage } from './pages/Workers';
import { LeadsTracker } from './pages/LeadsTracker';
import { ReceiptsPage } from './pages/Receipts';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { motion, AnimatePresence } from 'framer-motion';

function AppContent() {
  const { user, loading, isOwner } = useAuth();
  const [activeTab, setActiveTab] = React.useState('Master List');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Employees see a dedicated dashboard — no sidebar, no admin tabs
  if (!isOwner) {
    return <EmployeeDashboard />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Sales':
        return <Dashboard />;
      case 'Manage Team':
        return <WorkersPage />;
      case 'Receipts':
        return <ReceiptsPage />;
      case 'Master List':
        return <LeadsTracker />;
      case 'Settings':
        return <SettingsPage />;
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground text-center">
            <div className="bg-accent/50 p-6 rounded-full mb-4">
              <span className="text-4xl" role="img" aria-label="Under Construction">🚧</span>
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
    workers: 0,
    fullyPaid: 0,
    downpaymentOnly: 0,
    cancelled: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      const query = supabase.from('leads').select('deal_value, down_payment, status, payment_status, worker_id, commission_rate');
      if (!isOwner && profile?.id) {
        query.eq('worker_id', profile.id);
      }

      const [{ data: leads }, { data: workers }] = await Promise.all([
        query,
        supabase.from('workers').select('id').eq('active', true)
      ]);

      const closedLeads = leads?.filter(l => l.status === 'closed') || [];
      const totalBalance = leads?.reduce((acc, lead) => {
        const balance = lead.payment_status === 'Cancelled Project'
          ? (Number(lead.down_payment) || 0) - (Number(lead.deal_value) * (lead.commission_rate || 10) / 100)
          : Number(lead.deal_value) - (Number(lead.down_payment) || 0);
        return acc + balance;
      }, 0) || 0;

      const fullyPaidCount = leads?.filter(l => l.payment_status === 'Fully Paid').length || 0;
      const downpaymentOnlyCount = leads?.filter(l => l.payment_status === 'Downpayment Only' || l.payment_status === 'Not Paid' || !l.payment_status).length || 0;
      const cancelledCount = leads?.filter(l => l.payment_status === 'Cancelled Project').length || 0;

      setStats({
        closed: closedLeads.length,
        totalBalance,
        workers: workers?.length || 0,
        fullyPaid: fullyPaidCount,
        downpaymentOnly: downpaymentOnlyCount,
        cancelled: cancelledCount
      });
    };
    fetchStats();
  }, []);

  const totalProjects = stats.fullyPaid + stats.downpaymentOnly;
  const fullyPaidPercentage = totalProjects > 0 ? (stats.fullyPaid / totalProjects) * 100 : 0;
  const strokeDasharray = `${fullyPaidPercentage} ${100 - fullyPaidPercentage}`;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 overflow-x-hidden">
      {/* Sales Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em] mb-2">Financial Performance</p>
          <h2 className="text-5xl font-black tracking-tighter text-black uppercase italic italic">March 2026</h2>
        </div>
        <div className="flex gap-3">
          <div className="px-6 py-3 bg-white border border-zinc-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Month</span>
            <span className="font-bold text-black text-sm">March</span>
          </div>
          <div className="px-6 py-3 bg-white border border-zinc-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Year</span>
            <span className="font-bold text-black text-sm">2026</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Stats */}
        <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Monthly Revenue</p>
          <div>
            <span className="text-sm font-bold opacity-50 block mb-1">Total Balance</span>
            <p className="text-3xl font-black tracking-tighter tabular-nums">₱{stats.totalBalance.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Growth +12.5%</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm space-y-6">
          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-black" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Deals Closed</p>
          <p className="text-5xl font-black tracking-tighter text-black tabular-nums">{stats.closed}</p>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Monthly Target: 50</div>
        </div>


        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm space-y-6">
          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Employees Active</p>
          <p className="text-5xl font-black tracking-tighter text-black tabular-nums">{stats.workers}</p>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Daily Sales Trend</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Status Graph */}
        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tighter text-black uppercase italic">Payment Status</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Project Collections</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-48 h-48">
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
                <span className="text-2xl font-black text-black leading-none">{Math.round(fullyPaidPercentage)}%</span>
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Paid</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="p-6 bg-zinc-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-black" />
                  <span className="text-xs font-black uppercase tracking-widest text-black">Fully Paid:</span>
                </div>
                <span className="text-xl font-black text-black">{stats.fullyPaid}</span>
              </div>
              <div className="p-6 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Downpayment Only:</span>
                </div>
                <span className="text-xl font-black text-black">{stats.downpaymentOnly}</span>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cancelled Projects:</span>
                </div>
                <span className="text-sm font-black text-black">{stats.cancelled}</span>
              </div>
              <div className="pt-2 px-6 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Total Projects:</span>
                <span className="text-sm font-black text-black">{totalProjects}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Sales Trend Placeholder */}
        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tighter text-black uppercase italic">Performance Flow</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Daily Conversion Trend</p>
            </div>
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="h-32 flex items-end gap-2 px-4">
            {[40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 55].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 1 }}
                className="flex-1 bg-zinc-100 rounded-t-lg hover:bg-black transition-colors"
                title={`Day ${i + 1}: ${h}%`}
              />
            ))}
          </div>

          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-300 mt-6 pt-6 border-t border-zinc-50">
            <span>Mar 01</span>
            <span>Mar 09</span>
            <span>Today</span>
          </div>
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
