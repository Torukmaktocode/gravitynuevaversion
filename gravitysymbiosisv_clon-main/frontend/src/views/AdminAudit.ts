export function init() {
  const tbody = document.getElementById('admin-audit-table-body');
  if (!tbody) {return;}
  tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400 text-sm">Registro de auditoría próximamente.</td></tr>';
}
