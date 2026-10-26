import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

function showModal(id: string) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}
function hideModal(id: string) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}

export async function init() {
  if (store.currentProfile?.role !== 'super_admin') { return; }

  const tbody = document.getElementById('whitelist-table-body');
  if (!tbody) { return; }

  async function loadCompanies(): Promise<any[]> {
    const { data } = await supaClient.client
      .from('companies')
      .select('id, name, slug')
      .order('name');
    return data ?? [];
  }

  function populateCompanySelect(selectId: string, companies: any[], selectedId?: string) {
    const sel = document.getElementById(selectId) as HTMLSelectElement;
    if (!sel) { return; }
    sel.innerHTML = `<option value="">-- Sin empresa --</option>` +
      companies.map(c =>
        `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`
      ).join('');
  }

  async function load() {
    tbody!.innerHTML = `
      <tr>
        <td colspan="4" class="p-8 text-center text-gray-500">Cargando...</td>
      </tr>`;

    const { data, error } = await supaClient.client
      .from('email_whitelist')
      .select('id, email, company_id, created_at, companies!left(name)')
      .order('created_at', { ascending: false });

    if (error) {
      tbody!.innerHTML = `
        <tr>
          <td colspan="4" class="p-8 text-center text-red-400">
            Error: ${error.message}
          </td>
        </tr>`;
      return;
    }

    const rows = data ?? [];

    const statEl = document.getElementById('stat-whitelist-total');
    if (statEl) { statEl.textContent = String(rows.length); }

    if (rows.length === 0) {
      tbody!.innerHTML = `
        <tr>
          <td colspan="4" class="p-8 text-center text-gray-500">
            No hay emails en la lista blanca.
          </td>
        </tr>`;
      return;
    }

    tbody!.innerHTML = rows.map((row: any) => {
      const companyName = row.companies?.name ?? '<span class="text-gray-600">Sin empresa</span>';
      return `
      <tr class="border-b border-white/5 hover:bg-white/3 transition-colors">
        <td class="p-4 text-sm text-white font-mono">${row.email}</td>
        <td class="p-4 text-xs text-gray-300">${companyName}</td>
        <td class="p-4 text-xs text-gray-400">${new Date(row.created_at).toLocaleString()}</td>
        <td class="p-4">
          <button
            onclick="window._deleteWhitelistEntry('${row.id}')"
            class="px-3 py-1 text-[10px] font-black uppercase tracking-wider border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
            Eliminar
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  const companies = await loadCompanies();
  await load();

  document.getElementById('btn-add-whitelist-email')?.addEventListener('click', () => {
    const input = document.getElementById('whitelist-email-input') as HTMLInputElement;
    const msg = document.getElementById('whitelist-modal-msg')!;
    input.value = '';
    msg.classList.add('hidden');
    populateCompanySelect('whitelist-company-select', companies);
    showModal('whitelist-modal');
    input.focus();
  });

  document.getElementById('whitelist-modal-close')?.addEventListener('click', () => {
    hideModal('whitelist-modal');
  });

  document.getElementById('whitelist-modal-submit')?.addEventListener('click', async () => {
    const input = document.getElementById('whitelist-email-input') as HTMLInputElement;
    const companySelect = document.getElementById('whitelist-company-select') as HTMLSelectElement;
    const msg = document.getElementById('whitelist-modal-msg')!;
    const email = input.value.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Ingresa un email válido.';
      msg.className = 'text-sm text-center mt-3 text-red-400';
      msg.classList.remove('hidden');
      return;
    }

    const payload: any = { email };
    if (companySelect.value) {
      payload.company_id = companySelect.value;
    }

    const { error } = await supaClient.client
      .from('email_whitelist')
      .insert(payload);

    if (error) {
      msg.textContent = error.code === '23505'
        ? 'Este email ya está en la lista blanca.'
        : `Error: ${error.message}`;
      msg.className = 'text-sm text-center mt-3 text-red-400';
      msg.classList.remove('hidden');
      return;
    }

    msg.textContent = '¡Email agregado correctamente!';
    msg.className = 'text-sm text-center mt-3 text-violet-400';
    msg.classList.remove('hidden');
    setTimeout(() => { hideModal('whitelist-modal'); load(); }, 700);
  });

  (document.getElementById('whitelist-email-input') as HTMLInputElement)
    ?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('whitelist-modal-submit')?.click();
      }
    });

  (window as any)._deleteWhitelistEntry = async (id: string) => {
    if (!confirm('¿Eliminar este email de la lista blanca?')) { return; }
    const { error } = await supaClient.client
      .from('email_whitelist')
      .delete()
      .eq('id', id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      await load();
    }
  };
}
