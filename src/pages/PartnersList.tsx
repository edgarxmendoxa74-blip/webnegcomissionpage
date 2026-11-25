import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, User, Building2, Mail, Phone, MapPin, TrendingUp, Eye } from 'lucide-react';
import { fetchPartnerApplications, type PartnerApplication } from '../lib/partners';

export function PartnersList() {
  const [partners, setPartners] = useState<PartnerApplication[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<PartnerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedPartner, setSelectedPartner] = useState<PartnerApplication | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPartnerApplications();
      const approved = data.filter(p => p.status === 'approved');
      setPartners(approved);
      setFilteredPartners(approved);
    } catch (err) {
      console.error('Error loading partners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterPartners(query, statusFilter);
  };

  const handleStatusFilter = (status: typeof statusFilter) => {
    setStatusFilter(status);
    filterPartners(searchQuery, status);
  };

  const filterPartners = (query: string, status: typeof statusFilter) => {
    let filtered = partners;

    if (query.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.full_name.toLowerCase().includes(query.toLowerCase()) ||
          p.business_name.toLowerCase().includes(query.toLowerCase()) ||
          p.email.toLowerCase().includes(query.toLowerCase()) ||
          p.mobile_number.includes(query)
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }

    setFilteredPartners(filtered);
  };

  const downloadCSV = () => {
    if (filteredPartners.length === 0) return;

    const headers = [
      'Full Name',
      'Business Name',
      'Mobile',
      'Email',
      'Address',
      'Offered Price',
      'Markup',
      'Status',
      'Date Registered',
    ];

    const rows = filteredPartners.map((p) => [
      p.full_name,
      p.business_name,
      p.mobile_number,
      p.email,
      p.business_address,
      `₱${p.offered_price}`,
      `₱${p.markup}`,
      p.status || 'pending',
      p.created_at || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Registered Partners</h1>
        <p className="text-slate-600 dark:text-slate-400">View and manage all registered partners in the program</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Partners"
          value={partners.length}
          icon={<User className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          label="Total Revenue (Markup)"
          value={`₱${partners.reduce((sum, p) => sum + (p.markup || 0), 0).toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          label="Avg Markup"
          value={`₱${Math.round(partners.reduce((sum, p) => sum + (p.markup || 0), 0) / (partners.length || 1)).toLocaleString()}`}
          icon={<Building2 className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, business, email, or mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadCSV}
            disabled={filteredPartners.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-bold transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <motion.button
              key={status}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Partners Grid */}
      <div>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">Loading partners...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">No partners found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map((partner, idx) => (
              <motion.div
                key={partner.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                {/* Profile Picture */}
                <div className="h-40 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 flex items-center justify-center overflow-hidden relative">
                  {partner.profile_picture_url ? (
                    <img
                      src={partner.profile_picture_url}
                      alt={partner.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-slate-400" />
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* Name & Business */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{partner.full_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {partner.business_name}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{partner.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-4 h-4" />
                      {partner.mobile_number}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{partner.business_address}</span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Offered Price</p>
                      <p className="text-lg font-black text-orange-600 dark:text-orange-400">₱{partner.offered_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Markup</p>
                      <p className="text-lg font-black text-green-600 dark:text-green-400">₱{partner.markup.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Status Badge & Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs font-bold">
                      ✓ Approved
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedPartner(partner)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPartner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedPartner(null)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 border border-slate-200 dark:border-slate-700"
          >
            {/* Profile Picture */}
            {selectedPartner.profile_picture_url && (
              <div className="mb-6 rounded-xl overflow-hidden h-48">
                <img
                  src={selectedPartner.profile_picture_url}
                  alt={selectedPartner.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{selectedPartner.full_name}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{selectedPartner.business_name}</p>

            {/* Details */}
            <div className="space-y-4">
              <DetailRow label="Email" value={selectedPartner.email} />
              <DetailRow label="Mobile" value={selectedPartner.mobile_number} />
              <DetailRow label="Address" value={selectedPartner.business_address} />
              {selectedPartner.area_coverage && (
                <DetailRow label="Area Coverage" value={selectedPartner.area_coverage} />
              )}
              <DetailRow label="Offered Price" value={`₱${selectedPartner.offered_price.toLocaleString()}`} />
              <DetailRow label="Markup" value={`₱${selectedPartner.markup.toLocaleString()}`} />
              <DetailRow label="Profit Margin" value={`${Math.round((selectedPartner.markup / selectedPartner.offered_price) * 100)}%`} />
              <DetailRow label="Registered" value={selectedPartner.created_at || selectedPartner.stamp_date} />
              <DetailRow label="Status" value={selectedPartner.status || 'approved'} />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPartner(null)}
              className="w-full mt-6 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all"
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
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 pb-3 last:border-0">
      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase">{label}</p>
      <p className="text-sm text-slate-900 dark:text-white font-semibold mt-1">{value}</p>
    </div>
  );
}
