const mongoose = require('mongoose');

/**
 * Staff kullanıcılar için branchId zorunlu (superadmin hariç).
 * @returns {{ ok: true, branchId: string|null } | { ok: false, status: number, message: string }}
 */
function requireStaffBranch(req) {
  const role = req.user?.role;
  if (role === 'superadmin') {
    return { ok: true, branchId: req.user?.branchId || null };
  }
  const branchId = req.user?.branchId;
  if (!branchId) {
    return {
      ok: false,
      status: 403,
      message: 'Şube atanmamış hesap bu işlemi yapamaz',
    };
  }
  return { ok: true, branchId: String(branchId) };
}

function branchFilterForUser(user) {
  if (!user) return {};
  if (user.role === 'superadmin') return {};
  if (!user.branchId) return { __forbidden: true };
  return { branchId: new mongoose.Types.ObjectId(user.branchId) };
}

/**
 * Sipariş veya masa dokümanının kullanıcının şubesine ait olduğunu doğrula.
 */
function assertDocumentBranch(user, doc, { branchField = 'branchId' } = {}) {
  if (!user || !doc) return false;
  if (user.role === 'superadmin') return true;
  const docBranch = doc[branchField];
  if (!docBranch || !user.branchId) return false;
  return String(docBranch) === String(user.branchId);
}

function denyBranch(res, message = 'Bu kaynağa erişim yetkiniz yok') {
  return res.status(403).json({ message });
}

async function loadOrderForStaff(user, orderId, OrderModel) {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    return { error: { status: 404, message: 'Sipariş bulunamadı' } };
  }
  if (!assertDocumentBranch(user, order)) {
    return { error: { status: 403, message: 'Bu siparişe erişim yetkiniz yok' } };
  }
  return { order };
}

module.exports = {
  requireStaffBranch,
  branchFilterForUser,
  assertDocumentBranch,
  denyBranch,
  loadOrderForStaff,
};
