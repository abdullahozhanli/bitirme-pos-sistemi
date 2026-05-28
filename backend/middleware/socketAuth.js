const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const KITCHEN_ROLES = new Set(['mutfak', 'admin', 'yetkili', 'superadmin']);
const WAITER_ROLES = new Set(['garson', 'admin', 'yetkili', 'superadmin']);
const ADMIN_METRICS_ROLES = new Set(['admin', 'yetkili', 'superadmin']);
const TABLES_ROLES = new Set(['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'superadmin']);
const CUSTOMER_ROLES = new Set(['musteri', 'admin', 'superadmin']);

async function verifySocketToken(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(String(token).trim(), process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?.user?.id;
    if (!userId) return null;

    const user = await User.findById(userId).select('_id role branchId isActive').lean();
    if (!user || !user.isActive) return null;

    return {
      id: user._id.toString(),
      role: user.role,
      branchId: user.branchId ? user.branchId.toString() : null,
    };
  } catch {
    return null;
  }
}

function sameBranch(user, branchId) {
  if (user.role === 'superadmin') return true;
  if (!user.branchId || !branchId) return false;
  return user.branchId === String(branchId);
}

function attachSocketAuth(io) {
  io.use(async (socket, next) => {
    const raw =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      socket.handshake.query?.token;
    const user = await verifySocketToken(raw);
    if (!user) {
      return next(new Error('Unauthorized'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    socket.on('subscribe:kitchen', (data) => {
      if (!KITCHEN_ROLES.has(user.role)) return;
      const { branchId, station } = data || {};
      const branch = branchId || user.branchId;
      if (!branch || !sameBranch(user, branch)) return;

      if (station === '*' || !station) {
        ['hot', 'cold', 'bar', 'dessert'].forEach((st) => {
          socket.join(`kitchen.${branch}.${st}`);
        });
        socket.join(`kitchen.${branch}`);
      } else {
        socket.join(`kitchen.${branch}.${station}`);
        socket.join(`kitchen.${branch}`);
      }
    });

    socket.on('subscribe:waiter', (data) => {
      if (!WAITER_ROLES.has(user.role)) return;
      const waiterId = data?.waiterId;
      if (!waiterId) return;
      if (user.role === 'garson' && waiterId !== user.id) return;
      socket.join(`waiter.${waiterId}`);
    });

    socket.on('subscribe:admin', (data) => {
      if (!ADMIN_METRICS_ROLES.has(user.role)) return;
      const branchId = data?.branchId || user.branchId;
      if (!branchId || !sameBranch(user, branchId)) return;
      socket.join(`admin.metrics.${branchId}`);
    });

    socket.on('subscribe:tables', () => {
      if (!TABLES_ROLES.has(user.role)) return;
      if (user.role === 'superadmin') {
        socket.join('tables');
        return;
      }
      if (user.branchId) {
        socket.join(`tables.${user.branchId}`);
      }
    });

    socket.on('subscribe:customer', (data) => {
      if (!CUSTOMER_ROLES.has(user.role)) return;
      const userId = data?.userId;
      if (!userId) return;
      if (user.role === 'musteri' && userId !== user.id) return;
      socket.join(`customer.${userId}`);
    });
  });
}

module.exports = { attachSocketAuth, verifySocketToken };
