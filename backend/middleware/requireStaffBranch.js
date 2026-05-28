const { requireStaffBranch } = require('../utils/branchAccess');

/** Garson, mutfak, kasa — superadmin hariç şube zorunlu */
function requireStaffBranchMiddleware(req, res, next) {
  const result = requireStaffBranch(req);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.message });
  }
  req.staffBranchId = result.branchId;
  next();
}

module.exports = requireStaffBranchMiddleware;
