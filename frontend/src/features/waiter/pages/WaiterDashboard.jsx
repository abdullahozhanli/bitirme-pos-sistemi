import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CircularProgress, Alert } from '@mui/material';
import './WaiterDashboard.css';

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeTables: 0,
    pendingOrders: 0,
    readyOrders: 0,
    todayServed: 0,
  });
  const [activeTables, setActiveTables] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

        const [tablesRes, ordersRes, readyOrdersRes] = await Promise.all([
          axios.get('/api/waiter/tables', { headers }),
          axios.get('/api/waiter/orders', { 
            headers,
            params: { includeQR: 'true', limit: 100 }
          }),
          axios.get('/api/waiter/orders/ready', { headers }),
        ]);

        const tables = Array.isArray(tablesRes.data) ? tablesRes.data : [];
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.items || []);
        const readyOrdersData = Array.isArray(readyOrdersRes.data) ? readyOrdersRes.data : (readyOrdersRes.data?.items || []);

        const activeTablesCount = tables.filter(t => t.hasActiveOrder).length;
        const activeTablesList = tables.filter(t => t.hasActiveOrder).slice(0, 6);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayServed = orders.filter(o => {
          const orderDate = new Date(o.createdAt || o.created_at);
          const isServed = o.status === 'SERVED' || o.status === 'tamamlandi' || o.status === 'serviste';
          return isServed && orderDate >= today;
        }).length;

        const pendingOrders = orders.filter(o => {
          const status = o.status;
          return ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'hazirlaniyor'].includes(status);
        }).length;

        setStats({
          activeTables: activeTablesCount,
          pendingOrders,
          readyOrders: readyOrdersData.length,
          todayServed,
        });
        setActiveTables(activeTablesList);
        setAllOrders(orders);
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi:', err);
        setError(err.response?.data?.message || err.message || 'Veriler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    let isMounted = true;
    let intervalId = null;

    // İlk yüklemede loading göster
    fetchStats();

    // 60 saniyede bir sessizce güncelle (loading gösterme)
    const silentFetchStats = async () => {
      if (!isMounted) return;
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

        const [tablesRes, ordersRes, readyOrdersRes] = await Promise.all([
          axios.get('/api/waiter/tables', { headers }),
          axios.get('/api/waiter/orders', { 
            headers,
            params: { includeQR: 'true', limit: 100 }
          }),
          axios.get('/api/waiter/orders/ready', { headers }),
        ]);

        if (!isMounted) return;

        const tables = Array.isArray(tablesRes.data) ? tablesRes.data : [];
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.items || []);
        const readyOrdersData = Array.isArray(readyOrdersRes.data) ? readyOrdersRes.data : (readyOrdersRes.data?.items || []);

        const activeTablesCount = tables.filter(t => t.hasActiveOrder).length;
        const activeTablesList = tables.filter(t => t.hasActiveOrder).slice(0, 6);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayServed = orders.filter(o => {
          const orderDate = new Date(o.createdAt || o.created_at);
          const isServed = o.status === 'SERVED' || o.status === 'tamamlandi' || o.status === 'serviste';
          return isServed && orderDate >= today;
        }).length;

        const pendingOrders = orders.filter(o => {
          const status = o.status;
          return ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'hazirlaniyor'].includes(status);
        }).length;

        setStats({
          activeTables: activeTablesCount,
          pendingOrders,
          readyOrders: readyOrdersData.length,
          todayServed,
        });
        setActiveTables(activeTablesList);
        setAllOrders(orders);
        setLastUpdate(new Date());
      } catch (err) {
        if (!isMounted) return;
        console.error('Dashboard verileri yüklenemedi:', err);
      }
    };

    intervalId = setInterval(silentFetchStats, 60000); // 60 saniye

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Get order status text and color
  const getOrderStatus = (order) => {
    const status = order.status;
    if (status === 'PAID' || status === 'tamamlandi') {
      return { text: 'Servis Edildi', color: 'green' };
    }
    if (status === 'READY' || status === 'serviste') {
      return { text: 'Hazır', color: 'green' };
    }
    if (status === 'SENT_TO_KITCHEN' || status === 'IN_PREP' || status === 'hazirlaniyor') {
      return { text: 'Sipariş Alındı', color: 'orange' };
    }
    if (status === 'CREATED') {
      return { text: 'Sipariş Alındı', color: 'orange' };
    }
    // Check if order is paid but status is not updated
    if (order.isPaid || order.paidAt) {
      return { text: 'Ödeme Bekliyor', color: 'blue' };
    }
    return { text: 'Sipariş Alındı', color: 'orange' };
  };

  // Format time ago
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds} saniye önce`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dakika önce`;
    const hours = Math.floor(minutes / 60);
    return `${hours} saat önce`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <div className="waiter-dashboard">
      <header className="waiter-dashboard-header">
        <div>
          <h1>Garson Paneli</h1>
          <p>Masa ve sipariş durumlarınızı buradan takip edebilirsiniz.</p>
        </div>
      </header>

      {/* İstatistik Kartları */}
      <section className="summary-cards">
        <div className={`summary-card ${stats.activeTables === 0 ? 'inactive' : ''}`}>
          <div className="summary-card-title">Aktif Masalarım</div>
          <div className="summary-card-value">{stats.activeTables}</div>
          <button className="summary-card-link" onClick={() => navigate('/waiter/tables')}>
            Masa Haritası
          </button>
        </div>

        <div className={`summary-card pending ${stats.pendingOrders === 0 ? 'inactive' : ''}`}>
          <div className="summary-card-title">Bekleyen Siparişler</div>
          <div className="summary-card-value">{stats.pendingOrders}</div>
        </div>

        <div className={`summary-card ready ${stats.readyOrders === 0 ? 'inactive' : ''}`}>
          <div className="summary-card-title">Hazır Siparişler</div>
          <div className="summary-card-value">{stats.readyOrders}</div>
          {stats.readyOrders > 0 && (
            <div className="summary-card-badge">
              <span>🔔</span> Servise hazır!
            </div>
          )}
          <button className="summary-card-link" onClick={() => navigate('/waiter/orders?status=READY,serviste')}>
            Görüntüle
          </button>
        </div>

        <div className={`summary-card ${stats.todayServed === 0 ? 'inactive' : ''}`}>
          <div className="summary-card-title">Bugünkü Servis</div>
          <div className="summary-card-value">{stats.todayServed}</div>
        </div>
      </section>

      {/* Hızlı Erişim Butonları - Desktop */}
      <section className="quick-access quick-access-desktop">
        <button className="quick-access-btn blue" onClick={() => navigate('/waiter/tables')}>
          <i className="fas fa-map-marked-alt"></i>
          <span>Masa Haritası</span>
        </button>
        <button className="quick-access-btn white" onClick={() => navigate('/waiter/tables')}>
          <i className="fas fa-plus-circle"></i>
          <span>+ Yeni Sipariş Oluştur</span>
        </button>
        <button className="quick-access-btn white" onClick={() => navigate('/waiter/orders')}>
          <i className="fas fa-list-alt"></i>
          <span>Tüm Siparişler</span>
        </button>
      </section>

      {/* Sticky Bottom Bar - Mobile */}
      <div className="sticky-action-bar">
        <button className="sticky-btn sticky-btn-primary" onClick={() => navigate('/waiter/tables')}>
          <i className="fas fa-map-marked-alt"></i>
          <span>Masa Haritası</span>
        </button>
        <button className="sticky-btn sticky-btn-secondary" onClick={() => navigate('/waiter/tables')}>
          <i className="fas fa-plus-circle"></i>
          <span>Yeni Sipariş</span>
        </button>
      </div>



      {/* Aktif Masalar Grid */}
      {activeTables.length > 0 && (
        <section className="active-tables">
          <div className="section-header">
            <h2>Aktif Masalarım</h2>
            <div className="section-header-right">
              <span className="last-update">
                Son güncelleme {getTimeAgo(lastUpdate)}
                <button className="refresh-btn" onClick={() => window.location.reload()}>
                  <i className="fas fa-sync-alt"></i>
                </button>
              </span>
            </div>
          </div>
          <div className="active-tables-grid">
            {activeTables.map((table) => {
              const tableId = table._id || table.id;
              const tableName = table.name || 'N/A';
              const capacity = table.capacity || 0;
              
              const activeOrder = allOrders.find(o => {
                const orderTable = o.tableId || o.table;
                const orderTableId = typeof orderTable === 'object' ? orderTable?._id : orderTable;
                return String(orderTableId) === String(tableId);
              });

              const orderStatus = activeOrder ? getOrderStatus(activeOrder) : { text: 'Boş', color: 'gray' };
              const orderNumber = activeOrder ? `#${(activeOrder._id || activeOrder.id).toString().substring(0, 8)}` : '';

              return (
                <div key={tableId} className="table-card" onClick={() => navigate(`/waiter/tables`)}>
                  <div className="table-header">
                    <span className="table-name">{tableName}</span>
                  </div>
                  <div className="table-info">
                    <span className="table-capacity">{capacity} Kişilik</span>
                  </div>
                  {orderNumber && (
                    <div className="table-order-number">Sipariş Numarası {orderNumber}</div>
                  )}
                  <div className={`table-status-badge ${orderStatus.color}`}>
                    {orderStatus.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="view-all-container">
            <button className="view-all-btn" onClick={() => navigate('/waiter/tables')}>
              Tümünü Gör
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
