import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

let _allUsers: any[] = [];
let _allCompanies: any[] = [];

export async function init() {
  await loadData();
  setupFilters();
  setupModal();
}

async function loadData() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) { return; }
  tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">Cargando usuarios...</td></tr>';

  const [{ data: profiles }, { data: companies }] = await Promise.all([
    supaClient.client.from('profiles').select('*').order('created_at', { ascending: false }),
    supaClient.client.from('companies').select('id, name').order('name'),
  ]);

  _allUsers = profiles || [];
  _allCompanies = companies || [];

  // populate company select in modal
  const companySelect = document.getElementById('modal-change-role-company') as HTMLSelectElement;
  if (companySelect) {
    companySelect.innerHTML = '<option value="">Sin empresa</option>' +
      _allCompanies.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  renderUsers(_allUsers);
}

function renderUsers(users: any[]) {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) { return; }

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">No se encontraron usuarios.</td></tr>';
    return;
  }

  const roleColors: Record<string, string> = {
    'super_admin': 'bg-red-500/10 text-red-400 border border-red-500/20',
    'admin': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    'user': 'bg-white/5 text-gray-400 border border-white/10',
  };

  tbody.innerHTML = users.map((u: any) => {
    const company = _allCompanies.find((c: any) => c.id === u.company_id);
    const initial = (u.nickname || u.email || '?').charAt(0).toUpperCase();
    const roleClass = roleColors[u.role] || roleColors['user'];
    return `
      <tr class="border-b border-white/5 hover:bg-white/3 transition-colors">
        <td class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-black">${initial}</div>
            <div>
              <p class="text-sm text-white font-medium">${u.nickname || u.first_name || 'Agente'}</p>
              <p class="text-[10px] text-gray-500">${u.email || '—'}</p>
            </div>
          </div>
        </td>
        <td class="p-4 text-gray-400 text-sm">${company ? company.name : '<span class="text-gray-600">Sin empresa</span>'}</td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${roleClass}">
            ${u.role}
          </span>
        </td>
        <td class="p-4 text-gray-500 text-xs">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
        <td class="p-4">
          <button
            data-uid="${u.id}"
            data-email="${u.email || ''}"
            data-role="${u.role}"
            data-company="${u.company_id || ''}"
            class="btn-change-role px-3 py-1 text-[10px] font-black uppercase tracking-wider border border-white/10 text-gray-300 hover:text-white hover:border-white/30 rounded-lg transition-all">
            Cambiar rol
          </button>
        </td>
      </tr>`;
  }).join('');

  // attach row listeners
  document.querySelectorAll('.btn-change-role').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLElement;
      openRoleModal(
        el.dataset.uid!,
        el.dataset.email!,
        el.dataset.role!,
        el.dataset.company || ''
      );
    });
  });
}

function setupFilters() {
  const searchInput = document.getElementById('admin-users-search') as HTMLInputElement;
  const roleFilter = document.getElementById('admin-users-role-filter') as HTMLSelectElement;

  function applyFilters() {
    const q = searchInput?.value.toLowerCase() || '';
    const role = roleFilter?.value || '';
    const filtered = _allUsers.filter((u: any) => {
      const matchQ = !q || (u.email || '').toLowerCase().includes(q) || (u.nickname || '').toLowerCase().includes(q) || (u.first_name || '').toLowerCase().includes(q);
      const matchRole = !role || u.role === role;
      return matchQ && matchRole;
    });
    renderUsers(filtered);
  }

  searchInput?.addEventListener('input', applyFilters);
  roleFilter?.addEventListener('change', applyFilters);
}

function openRoleModal(uid: string, email: string, currentRole: string, currentCompanyId: string) {
  (document.getElementById('modal-change-role-uid') as HTMLInputElement).value = uid;
  document.getElementById('modal-change-role-user')!.textContent = email;
  
  const select = document.getElementById('modal-change-role-select') as HTMLSelectElement;
  const isSuper = store.currentProfile?.role === 'super_admin';
  select.innerHTML = `
    <option value="user">Usuario</option>
    <option value="admin">Admin</option>
    ${isSuper ? '<option value="super_admin">Super Admin</option>' : ''}
  `;
  select.value = currentRole;

  const companyContainer = document.getElementById('modal-change-role-company-container')!;
  const companySelect = document.getElementById('modal-change-role-company') as HTMLSelectElement;

  const isAdminLogueado = store.currentProfile?.role === 'admin';
  if (isAdminLogueado) {
    companyContainer.classList.add('hidden');
    companySelect.value = store.currentProfile?.company_id || '';
  } else {
    companyContainer.classList.remove('hidden');
    companySelect.value = currentCompanyId;
  }

  const msgEl = document.getElementById('modal-change-role-msg')!;
  msgEl.classList.add('hidden');
  const modal = document.getElementById('modal-change-role')!;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function setupModal() {
  document.getElementById('modal-change-role-close')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-change-role')!;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  document.getElementById('modal-change-role-select')?.addEventListener('change', (e) => {
    const isAdminLogueado = store.currentProfile?.role === 'admin';
    if (isAdminLogueado) { return; }
    const role = (e.target as HTMLSelectElement).value;
    const container = document.getElementById('modal-change-role-company-container')!;
    const companySelect = document.getElementById('modal-change-role-company') as HTMLSelectElement;
    if (role === 'admin') {
      container.classList.add('hidden');
      companySelect.value = store.currentProfile?.company_id || '';
    } else {
      container.classList.remove('hidden');
    }
  });

  document.getElementById('modal-change-role-submit')?.addEventListener('click', async () => {
    const uid = (document.getElementById('modal-change-role-uid') as HTMLInputElement).value;
    const role = (document.getElementById('modal-change-role-select') as HTMLSelectElement).value;
    const companyId = (document.getElementById('modal-change-role-company') as HTMLSelectElement).value;
    const msgEl = document.getElementById('modal-change-role-msg')!;

    const isAdminLogueado = store.currentProfile?.role === 'admin';
    const updates: any = { role };
    if (isAdminLogueado) {
      updates.company_id = store.currentProfile?.company_id || null;
    } else {
      updates.company_id = companyId || null;
    }

    if (role === 'super_admin' && store.currentProfile?.role !== 'super_admin') {
      msgEl.textContent = 'Error: Solo un Super Admin puede asignar este rol.';
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    const { error } = await supaClient.client.from('profiles').update(updates).eq('id', uid);

    if (error) {
      msgEl.textContent = `Error: ${error.message}`;
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    msgEl.textContent = '¡Rol actualizado correctamente!';
    msgEl.className = 'text-sm text-center mt-3 text-violet-400';
    msgEl.classList.remove('hidden');

    // update local cache
    const user = _allUsers.find((u: any) => u.id === uid);
    if (user) {
      user.role = role;
      user.company_id = isAdminLogueado ? (store.currentProfile?.company_id || null) : (companyId || null);
    }

    setTimeout(async () => {
      const modal = document.getElementById('modal-change-role')!;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      await loadData();
    }, 700);
  });
}
