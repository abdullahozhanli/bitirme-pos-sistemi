/**
 * Table and Staff data structures and mock API functions.
 * Provides type definitions and mock API endpoints for table management.
 */

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  openOrders: number;
  assigneeId?: string;
  note?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'garson' | 'mutfak' | 'kasa';
  active: boolean;
}

/**
 * Mock API function to fetch tables.
 * Returns 3-8 demo tables with mixed statuses.
 *
 * @returns {Promise<Table[]>} Array of table objects
 * @example
 * const tables = await getTables();
 */
export async function getTables(): Promise<Table[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const staffIds = ['staff-1', 'staff-2', 'staff-3'];
  const tableNames = ['Masa 1', 'Masa 2', 'Masa 3', 'Masa 4', 'Masa 5', 'Masa 6', 'Masa 7', 'Masa 8'];
  const statuses: TableStatus[] = ['available', 'occupied', 'reserved'];
  const capacities = [2, 4, 6, 8];

  const tableCount = 3 + Math.floor(Math.random() * 6); // 3-8 tables
  const tables: Table[] = [];

  for (let i = 0; i < tableCount; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const capacity = capacities[Math.floor(Math.random() * capacities.length)];
    const openOrders = status === 'occupied' ? Math.floor(Math.random() * 3) + 1 : 0;
    const assigneeId = status === 'occupied' && Math.random() > 0.3 ? staffIds[Math.floor(Math.random() * staffIds.length)] : undefined;
    const note = Math.random() > 0.7 ? `Not: ${['VIP', 'Pencere kenarı', 'Sessiz köşe'][Math.floor(Math.random() * 3)]}` : undefined;

    tables.push({
      id: `table-${i + 1}`,
      name: tableNames[i] || `Masa ${i + 1}`,
      capacity,
      status,
      openOrders,
      assigneeId,
      note,
    });
  }

  return tables;
}

/**
 * Mock API function to fetch staff members.
 * Returns 3-6 demo staff members with mixed roles.
 *
 * @returns {Promise<Staff[]>} Array of staff objects
 * @example
 * const staff = await getStaff();
 */
export async function getStaff(): Promise<Staff[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const staffNames = [
    'Ahmet Yılmaz',
    'Ayşe Demir',
    'Mehmet Kaya',
    'Fatma Şahin',
    'Ali Öztürk',
    'Zeynep Çelik',
  ];
  const roles: Array<'garson' | 'mutfak' | 'kasa'> = ['garson', 'mutfak', 'kasa'];

  const staffCount = 3 + Math.floor(Math.random() * 4); // 3-6 staff
  const staff: Staff[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < staffCount; i++) {
    let name: string;
    do {
      name = staffNames[Math.floor(Math.random() * staffNames.length)];
    } while (usedNames.has(name) && usedNames.size < staffNames.length);
    usedNames.add(name);

    const role = roles[Math.floor(Math.random() * roles.length)];
    const active = Math.random() > 0.2; // 80% active

    staff.push({
      id: `staff-${i + 1}`,
      name,
      role,
      active,
    });
  }

  return staff;
}

/**
 * Mock API function to update a table.
 * Updates assignee and/or note for a table.
 *
 * @param {object} payload - Update payload
 * @param {string} payload.id - Table ID
 * @param {string} [payload.assigneeId] - Optional assignee ID
 * @param {string} [payload.note] - Optional note
 * @returns {Promise<void>}
 * @example
 * await updateTable({ id: 'table-1', assigneeId: 'staff-1', note: 'VIP customer' });
 */
export async function updateTable(payload: { id: string; assigneeId?: string; note?: string }): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.info('updateTable', payload);
}


