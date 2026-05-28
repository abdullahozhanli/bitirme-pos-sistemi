/**
 * Şube kapsamlı Socket.io odaları
 */
function tablesRoom(branchId) {
  if (branchId) return `tables.${branchId}`;
  return 'tables';
}

function emitToTables(io, branchId, event, payload) {
  if (!io || !event) return;
  io.to(tablesRoom(branchId)).emit(event, payload);
}

module.exports = { tablesRoom, emitToTables };
