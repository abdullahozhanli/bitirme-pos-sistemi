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
  const [readyOrders, setReadyOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setReadyOrders(readyOrdersData.slice(0, 5));
        setAllOrders(orders);
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi:', err);
        setError(err.response?.data?.message || err.message || 'Veriler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="waiter-dashboard-header-left">
          <h1>Garson Paneli</h1>
          <p>Masa yönetimi ve sipariş takibi</p>
        </div>
      </header>

      {/* İstatistik Kartları */}
      <section className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon blue">
              <i className="fas fa-utensils"></i>
            </div>
            <span className="summary-card-title">Aktif Masalarım</span>
          </div>
          <div className="summary-card-content">
            <div className="summary-card-value">
              {stats.activeTables}
              <small>Masa</small>
            </div>
            <button className="summary-card-link" onClick={() => navigate('/waiter/tables')}>
              Masa Haritası <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon orange">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <span className="summary-card-title">Bekleyen Siparişler</span>
          </div>
          <div className="summary-card-content">
            <div className="summary-card-value">
              {stats.pendingOrders}
              <small>Adet</small>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon green">
              <i className="fas fa-check-circle"></i>
            </div>
            <span className="summary-card-title">Hazır Siparişler</span>
          </div>
          <div className="summary-card-content">
            <div className="summary-card-value">
              {stats.readyOrders}
              <small>Adet</small>
            </div>
            <button className="summary-card-link" onClick={() => navigate('/waiter/orders?status=READY,serviste')}>
              Görüntüle <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-card-icon purple">
              <i className="fas fa-mug-hot"></i>
            </div>
            <span className="summary-card-title">Bugünkü Servis</span>
          </div>
          <div className="summary-card-content">
            <div className="summary-card-value">
              {stats.todayServed}
              <small>Adet</small>
            </div>
          </div>
        </div>
      </section>

      {/* Hızlı Erişim Butonları */}
      <section className="quick-access">
        <button className="quick-access-btn blue" onClick={() => navigate('/waiter/tables')}>
          <i className="fas fa-map-marked-alt"></i> Masa Haritası
        </button>
        <button className="quick-access-btn green" onClick={() => navigate('/waiter/orders/create')}>
          <i className="fas fa-plus-circle"></i> Yeni Sipariş Oluştur
        </button>
        <button className="quick-access-btn light" onClick={() => navigate('/waiter/orders')}>
          <i className="fas fa-list-alt"></i> Tüm Siparişler
        </button>
      </section>

      {/* Hazır Siparişler Uyarısı */}
      {stats.readyOrders > 0 && (
        <section className="notification-bar">
          <span>
            <i className="fas fa-info-circle"></i> {stats.readyOrders} hazır sipariş servis edilmeyi bekliyor
          </span>
          <button onClick={() => navigate('/waiter/orders?status=READY,serviste')}>
            Görüntüle
          </button>
        </section>
      )}

      {/* Hazır Siparişler Listesi */}
      {readyOrders.length > 0 && (
        <section className="ready-orders">
          <div className="section-header">
            <h2>Hazır Siparişler</h2>
            <div className="badge">{readyOrders.length} Adet</div>
          </div>
          <div className="ready-orders-list">
            {readyOrders.map((order) => {
              const orderId = order._id || order.id;
              const table = order.tableId || order.table;
              const tableName = typeof table === 'object' ? table?.name : table || 'N/A';
              const itemsCount = (order.items || order.orderItems || []).length;
              const orderNumber = orderId ? `SIP-${orderId.toString().substring(0, 8).toUpperCase()}` : 'N/A';

              return (
                <div key={orderId} className="order-item">
                  <div className="order-details">
                    <span className="icon">
                      <i className="fas fa-check-circle"></i>
                    </span>
                    <div>
                      <div className="order-id">{orderNumber}</div>
                      <div className="order-info">{tableName} • {itemsCount} ürün</div>
                    </div>
                  </div>
                  <button className="serve-button" onClick={() => navigate('/waiter/orders?status=READY,serviste')}>
                    Servis Et
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Aktif Masalar Grid */}
      {activeTables.length > 0 && (
        <section className="active-tables">
          <div className="section-header">
            <div>
              <h2>Aktif Masalarım</h2>
              <p style={{ color: '#6c757d', fontSize: '0.95rem', marginTop: '-10px', marginBottom: 0 }}>
                Sorumluluğunuz dolu masalar
              </p>
            </div>
            <button className="see-all" onClick={() => navigate('/waiter/tables')}>
              Tümünü Gör <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="active-tables-grid">
            {activeTables.map((table) => {
              const tableId = table._id || table.id;
              const tableName = table.name || 'N/A';
              const capacity = table.capacity || 0;
              const statusColor = table.status === 'occupied' ? 'orange' : table.status === 'reserved' ? 'blue' : 'green';
              const statusText = table.status === 'occupied' ? 'Aktif Sipariş' : table.status === 'reserved' ? 'Rezerve' : 'Aktif Sipariş';
              
              const activeOrder = allOrders.find(o => {
                const orderTable = o.tableId || o.table;
                const orderTableId = typeof orderTable === 'object' ? orderTable?._id : orderTable;
                return String(orderTableId) === String(tableId);
              });
              const orderNumber = activeOrder ? `SIP-${(activeOrder._id || activeOrder.id).toString().substring(0, 8).toUpperCase()}` : '';

              return (
                <div key={tableId} className={`table-card ${statusColor}`}>
                  <div className="table-header">
                    <span className="table-name">{tableName}</span>
                    <span className="table-icon">
                      <i className="fas fa-utensils"></i>
                    </span>
                  </div>
                  <div className="table-info">
                    <span>{capacity}</span> Kişilik
                  </div>
                  <div className={`table-status ${statusColor}`}>
                    {statusText}
                  </div>
                  {orderNumber && (
                    <div className="table-order-id">{orderNumber}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
