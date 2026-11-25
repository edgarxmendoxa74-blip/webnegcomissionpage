import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Lock,
  LogOut,
} from 'lucide-react';
import {
  fetchPartnerApplications,
  updatePartnerApplicationStatus,
  searchPartnerApplications,
  type PartnerApplication,
} from '../lib/partners';

export function PartnerAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<PartnerApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<PartnerApplication | null>(null);
  
  const ADMIN_PASSWORD = 'SmartMenu2024'; // Change this to a secure password
  const STATUS_COLORS = {
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-200', icon: Clock },
    approved: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-200', icon: CheckCircle2 },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-200', icon: XCircle },
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
      setPasswordError('');
      loadApplications();
    } else {
      setPasswordError('Maling password. Subukan ulit.');
      setPassword('');
    }
  };

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPartnerApplications();
      setApplications(data);
      setFilteredApplications(data);
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredApplications(applications);
      return;
    }

    try {
      const results = await searchPartnerApplications(query);
      setFilteredApplications(results);
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const handleStatusChange = async (id: string | undefined, newStatus: 'pending' | 'approved' | 'rejected') => {
    if (!id) return;

    try {
      await updatePartnerApplicationStatus(id, newStatus);
      await loadApplications();
      setSelectedApp(null);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const downloadCSV = () => {
    if (filteredApplications.length === 0) return;

    const headers = [
      'Full Name',
      'Business Name',
      'Mobile',
      'Email',
      'Address',
      'Area Coverage',
      'Offered Price',
      'Markup',
      'Terms Accepted',
      'Stamp Date',
      'Status',
      'Created At',
    ];

    const rows = filteredApplications.map((app) => [
      app.full_name,
      app.business_name,
      app.mobile_number,
      app.email,
      app.business_address,
      app.area_coverage || '-',
      `₱${app.offered_price}`,
      `₱${app.markup}`,
      app.accepted_terms ? 'Yes' : 'No',
      app.stamp_date,
      app.status || 'pending',
      app.created_at || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700"
        >
          <div className="text-center mb-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Partner Admin</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Secure access to partner applications
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter admin password"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                  passwordError
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                } text-slate-900 dark:text-white focus:outline-none focus:border-orange-500`}
              />
              {passwordError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{passwordError}</p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-bold transition-all"
            >
              Login
            </motion.button>
          </form>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
            For security, only authorized admins can access this page.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Partner Applications
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage and review all partner sign-ups
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsAuthenticated(false);
              setApplications([]);
              setFilteredApplications([]);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </motion.button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, email, or mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadCSV}
            disabled={filteredApplications.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-bold transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Applications"
            value={applications.length.toString()}
            icon={<Eye className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Pending"
            value={applications.filter((a) => a.status === 'pending').length.toString()}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Approved"
            value={applications.filter((a) => a.status === 'approved').length.toString()}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Rejected"
            value={applications.filter((a) => a.status === 'rejected').length.toString()}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
          />
        </div>

        {/* Applications Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-600 dark:text-slate-400">No applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-900 dark:text-white">Name</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900 dark:text-white">Business</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900 dark:text-white">Email</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900 dark:text-white">Mobile</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">Offered Price</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">Markup</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, idx) => {
                    const statusConfig = STATUS_COLORS[app.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <motion.tr
                        key={app.id || idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{app.full_name}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{app.business_name}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{app.email}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{app.mobile_number}</td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-bold">
                          ₱{app.offered_price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-bold">
                          ₱{app.markup.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text} text-xs font-bold`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {(app.status || 'pending').toUpperCase()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelectedApp(app)}
                            className="text-orange-500 hover:text-orange-600 font-bold text-sm"
                          >
                            View
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedApp(null)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 border border-slate-200 dark:border-slate-700"
          >
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Application Details</h2>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Full Name</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedApp.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Business Name</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedApp.business_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Email</p>
                <p className="text-sm text-slate-900 dark:text-white">{selectedApp.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Mobile</p>
                <p className="text-sm text-slate-900 dark:text-white">{selectedApp.mobile_number}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Address</p>
                <p className="text-sm text-slate-900 dark:text-white">{selectedApp.business_address}</p>
              </div>
              {selectedApp.area_coverage && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Area Coverage</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedApp.area_coverage}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Offered Price</p>
                <p className="text-xl font-black text-orange-600 dark:text-orange-400">₱{selectedApp.offered_price.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Markup</p>
                <p className="text-xl font-black text-green-600 dark:text-green-400">₱{selectedApp.markup.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Terms Accepted</p>
                <p className="text-sm text-slate-900 dark:text-white">{selectedApp.accepted_terms ? '✓ Yes' : '✗ No'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Stamp Date</p>
                <p className="text-sm text-slate-900 dark:text-white">{selectedApp.stamp_date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Current Status</p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${STATUS_COLORS[(selectedApp.status as keyof typeof STATUS_COLORS) || 'pending'].bg} ${STATUS_COLORS[(selectedApp.status as keyof typeof STATUS_COLORS) || 'pending'].text} text-xs font-bold mt-1`}>
                  {React.createElement(STATUS_COLORS[(selectedApp.status as keyof typeof STATUS_COLORS) || 'pending'].icon, { className: 'w-3.5 h-3.5' })}
                  {(selectedApp.status || 'pending').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Status Update Buttons */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">Change Status:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleStatusChange(selectedApp.id, 'approved')}
                  className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleStatusChange(selectedApp.id, 'rejected')}
                  className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleStatusChange(selectedApp.id, 'pending')}
                  className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Clock className="w-4 h-4" />
                  Pending
                </motion.button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedApp(null)}
              className="w-full mt-6 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold transition-all"
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
