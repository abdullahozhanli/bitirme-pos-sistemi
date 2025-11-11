import React from 'react';

/**
 * SummaryCard - Reusable summary card component
 */
const SummaryCard = ({ title, value, icon, trend, trendValue, hint }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{trend === 'up' ? '↑' : '↓'}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="text-gray-600 text-sm mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
    </div>
  );
};

/**
 * AdminPanel - Only shows summary cards
 */
const AdminPanel = () => {
  // Mock summary data
  const summaryData = [
    {
      title: 'Toplam Ciro (Ödenenler)',
      value: '2.467 TL',
      icon: '💲',
      trend: 'up',
      trendValue: '+12.5%',
      hint: 'dünden',
    },
    {
      title: 'Toplam Sipariş',
      value: '12 Adet',
      icon: '🛒',
      trend: 'up',
      trendValue: '+8.2%',
      hint: 'bu hafta',
    },
    {
      title: 'Bekleyen Sipariş',
      value: '12 Adet',
      icon: '⏰',
      hint: 'aktif',
    },
    {
      title: 'İptal Edilen',
      value: '0 Adet',
      icon: '❌',
      trend: 'down',
      trendValue: '-2.1%',
      hint: 'dünden',
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryData.map((card, index) => (
          <SummaryCard key={index} {...card} />
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
