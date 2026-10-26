import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

// ── helper ─────────────────────────────────────────────────────────────────
function showModal(id: string) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}
function hideModal(id: string) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}

// ── main entry ─────────────────────────────────────────────────────────────
export async function init() {
  if (store.currentProfile?.role === 'super_admin') {
    await initSuperAdmin();
  } else {
    await initCompanyAdmin();
  }
}

// ── SUPER ADMIN: list all companies, CRUD ──────────────────────────────────
async function initSuperAdmin() {
  const tbody = document.getElementById('admin-companies-table-body');
  if (!tbody) { return; }

  async function loadCompanies() {
    tbody!.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">Cargando...</td></tr>';
    
    const { session } = await supaClient.getCurrentSession();
    const token = session?.access_token;
    
    let companies = [];
    try {
      const res = await fetch(`${store.API_URL}/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        companies = await res.json();
      } else {
        console.error("Error fetching companies:", await res.text());
      }
    } catch (e) {
      console.error("Error fetching companies:", e);
    }

    if (!companies || companies.length === 0) {
      tbody!.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">No hay empresas registradas.</td></tr>';
      return;
    }

    // update stats
    const active = companies.filter((c: any) => c.is_active).length;
    const withAI = companies.filter((c: any) => c.openai_assistant_id).length;
    document.getElementById('stat-total-companies')!.textContent = String(companies.length);
    document.getElementById('stat-active-companies')!.textContent = String(active);
    document.getElementById('stat-companies-with-ai')!.textContent = String(withAI);

    // count users per company
    const { data: profiles } = await supaClient.client.from('profiles').select('company_id');
    const totalUsers = profiles?.length ?? 0;
    document.getElementById('stat-total-users-companies')!.textContent = String(totalUsers);

    tbody!.innerHTML = companies.map((c: any) => `
      <tr class="border-b border-white/5 hover:bg-white/3 transition-colors">
        <td class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black font-orbitron text-sm">
              ${c.name.charAt(0).toUpperCase()}
            </div>
            <span class="text-white font-medium text-sm">${c.name}</span>
          </div>
        </td>
        <td class="p-4 text-gray-400 text-sm font-mono">${c.slug}</td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${c.is_active ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">
            ${c.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </td>
        <td class="p4">
            ${c.openai_assistant_id
    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">Configurado</span>`
    : `<span class="text-[10px] text-gray-600">No configurado</span>`}
        </td>
        <td class="p-4 text-gray-400 text-xs">${new Date(c.created_at).toLocaleDateString()}</td>
        <td class="p-4">
          <div class="flex gap-2">
            <button onclick="window._editCompany('${c.id}', '${c.name}', '${c.slug}', '${c.openai_assistant_id || ''}', ${c.is_active})"
              class="px-3 py-1 text-[10px] font-black uppercase tracking-wider border border-white/10 text-gray-300 hover:text-white hover:border-white/30 rounded-lg transition-all">
              Editar
            </button>
            <button onclick="window._toggleCompany('${c.id}', ${c.is_active})"
              class="px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${c.is_active ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-violet-500/20 text-violet-400 hover:bg-violet-500/10'} rounded-lg transition-all">
              ${c.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  await loadCompanies();

  // ── Create modal ──
  document.getElementById('btn-create-company')?.addEventListener('click', () => {
    (document.getElementById('modal-company-id') as HTMLInputElement).value = '';
    (document.getElementById('modal-company-name') as HTMLInputElement).value = '';
    (document.getElementById('modal-company-slug') as HTMLInputElement).value = '';
    (document.getElementById('modal-company-assistant-id') as HTMLInputElement).value = '';
    (document.getElementById('modal-company-active') as HTMLInputElement).checked = true;
    document.getElementById('modal-company-title')!.textContent = 'Nueva Empresa';
    const msg = document.getElementById('modal-company-msg')!;
    msg.classList.add('hidden');
    showModal('modal-company');
  });

  document.getElementById('modal-company-close')?.addEventListener('click', () => hideModal('modal-company'));

  document.getElementById('modal-company-submit')?.addEventListener('click', async () => {
    const id = (document.getElementById('modal-company-id') as HTMLInputElement).value;
    const name = (document.getElementById('modal-company-name') as HTMLInputElement).value.trim();
    const slug = (document.getElementById('modal-company-slug') as HTMLInputElement).value.trim();
    const assistantId = (document.getElementById('modal-company-assistant-id') as HTMLInputElement).value.trim();
    const isActive = (document.getElementById('modal-company-active') as HTMLInputElement).checked;
    const msgEl = document.getElementById('modal-company-msg')!;

    if (!name || !slug) {
      msgEl.textContent = 'Nombre y slug son obligatorios.';
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    const payload: any = { name, slug, is_active: isActive };
    if (assistantId) { payload.openai_assistant_id = assistantId; }
    else { payload.openai_assistant_id = null; }

    let error: any;
    if (id) {
      ({ error } = await supaClient.client.from('companies').update(payload).eq('id', id));
    } else {
      ({ error } = await supaClient.client.from('companies').insert(payload));
    }

    if (error) {
      msgEl.textContent = `Error: ${error.message}`;
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    msgEl.textContent = '¡Guardado correctamente!';
    msgEl.className = 'text-sm text-center mt-3 text-violet-400';
    msgEl.classList.remove('hidden');
    setTimeout(() => { hideModal('modal-company'); loadCompanies(); }, 800);
  });

  // ── global helpers for row buttons ──
  (window as any)._editCompany = (id: string, name: string, slug: string, assistantId: string, isActive: boolean) => {
    (document.getElementById('modal-company-id') as HTMLInputElement).value = id;
    (document.getElementById('modal-company-name') as HTMLInputElement).value = name;
    (document.getElementById('modal-company-slug') as HTMLInputElement).value = slug;
    (document.getElementById('modal-company-assistant-id') as HTMLInputElement).value = assistantId || '';
    (document.getElementById('modal-company-active') as HTMLInputElement).checked = isActive;
    document.getElementById('modal-company-title')!.textContent = 'Editar Empresa';
    const msg = document.getElementById('modal-company-msg')!;
    msg.classList.add('hidden');
    showModal('modal-company');
  };

  (window as any)._toggleCompany = async (id: string, currentActive: boolean) => {
    await supaClient.client.from('companies').update({ is_active: !currentActive }).eq('id', id);
    await loadCompanies();
  };
}

// ── COMPANY ADMIN: read-only own company + users ───────────────────────────
async function initCompanyAdmin() {
  (window as any)._changeCompanyUserRole = async (userId: string, newRole: string, companyId: string) => {
    try {
      const { session } = await supaClient.getCurrentSession();
      const token = session?.access_token;
      
      const res = await fetch(`${store.API_URL}/companies/${companyId}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + errorData.error);
        await initCompanyAdmin(); // revert select
      } else {
        // reload gracefully to see changes
        await initCompanyAdmin();
      }
    } catch (e: any) {
      alert('Error cambiando rol: ' + e.message);
      await initCompanyAdmin();
    }
  };
  const company = await supaClient.getMyCompany();
  const detailEl = document.getElementById('company-detail');
  const usersEl = document.getElementById('company-users-list');
  if (!detailEl || !usersEl) { return; }

  detailEl.classList.remove('hidden');
  usersEl.classList.remove('hidden');

  // hide super_admin table elements for company_admin
  document.getElementById('btn-create-company')?.classList.add('hidden');
  document.getElementById('admin-company-stats')?.classList.add('hidden');
  const table = document.getElementById('admin-companies-table-body')?.closest('.card');
  if (table) { table.classList.add('hidden'); }

  if (!company) {
    detailEl.innerHTML = '<p class="text-gray-400 text-sm">No tienes una compañía asignada. Contacta al super admin.</p>';
    usersEl.innerHTML = '';
    return;
  }

  detailEl.innerHTML = `
    <div class="card p-6">
      <h3 class="font-orbitron text-lg font-bold text-white mb-4">Información General</h3>
      <div class="flex items-center gap-4 mb-4">
        ${company.logo_url ? `<img src="${company.logo_url}" class="w-12 h-12 rounded-lg object-cover">` : `<div class="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black font-orbitron text-xl">${company.name.charAt(0).toUpperCase()}</div>`}
        <div>
          <p class="text-white font-bold text-lg">${company.name}</p>
          <p class="text-gray-500 text-xs uppercase tracking-wider">${company.slug}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-gray-500">Estado:</span> <span class="text-white">${company.is_active ? 'Activa' : 'Inactiva'}</span></div>
        <div><span class="text-gray-500">Creada:</span> <span class="text-white">${new Date(company.created_at).toLocaleDateString()}</span></div>
      </div>
    </div>`;

  const users = await supaClient.getCompanyUsers(company.id);
  usersEl.innerHTML = `<div class="card p-6"><h3 class="font-orbitron text-lg font-bold text-white mb-4">Usuarios de la Compañía</h3>
    <div class="space-y-2">
      ${!users || users.length === 0
    ? '<p class="text-gray-400 text-sm">No hay usuarios en esta compañía.</p>'
    : users.map((u: any) => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">${(u.nickname || u.email || '?').charAt(0).toUpperCase()}</div>
              <div>
                <p class="text-sm text-white font-medium">${u.nickname || u.email?.split('@')[0] || 'Agente'}</p>
                <p class="text-[10px] text-gray-500">${u.email}</p>
              </div>
            </div>
            <select 
              class="bg-gray-800 text-xs text-white rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary border-none cursor-pointer"
              onchange="window._changeCompanyUserRole('${u.id}', this.value, '${company.id}')"
            >
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>`).join('')}
    </div>
  </div>`;
}
