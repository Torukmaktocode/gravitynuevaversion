import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

let _companyId: string | null = null;
let _currentModule: string | null = null;
let _allCompanies: any[] = [];

export async function init() {
  if (store.currentProfile?.role === 'super_admin') {
    await initSuperAdmin();
  } else if (store.currentProfile?.role === 'admin' && store.currentProfile?.company_id) {
    _companyId = store.currentProfile.company_id;
    await initCompanyAdmin();
  }
}

async function loadCompanies() {
  const { data } = await supaClient.client.from('companies').select('id, name').order('name');
  _allCompanies = data || [];
  return _allCompanies;
}

async function initSuperAdmin() {
  await loadCompanies();

  const select = document.getElementById('knowledge-admin-company-select') as HTMLSelectElement;
  if (select) {
    select.innerHTML = _allCompanies.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');
    select.addEventListener('change', () => {
      _companyId = select.value;
      showModules();
    });
  }

  document.getElementById('knowledge-admin-super-select')?.classList.remove('hidden');

  if (_allCompanies.length > 0) {
    _companyId = _allCompanies[0].id as string;
    if (select) { select.value = _companyId; }
  }

  document.getElementById('btn-knowledge-admin-add-module')?.classList.remove('hidden');
  setupModuleModal();
  setupItemModal();
  setupNavigation();
  await showModules();
}

async function initCompanyAdmin() {
  document.getElementById('btn-knowledge-admin-add-module')?.classList.remove('hidden');
  setupModuleModal();
  setupItemModal();
  setupNavigation();
  await showModules();
}

function setupNavigation() {
  document.getElementById('knowledge-admin-back')?.addEventListener('click', () => {
    _currentModule = null;
    showModules();
  });

  document.getElementById('btn-knowledge-admin-add-item')?.addEventListener('click', () => {
    openItemModal(null);
  });

  document.getElementById('btn-knowledge-admin-delete-module')?.addEventListener('click', async () => {
    if (!_companyId || !_currentModule) { return; }
    if (!confirm(`¿Eliminar todo el módulo "${_currentModule}" y sus ${document.querySelectorAll('#knowledge-admin-items-body tr').length} items?`)) { return; }

    await supaClient.client.from('knowledge_content').delete().eq('company_id', _companyId).eq('module', _currentModule);
    _currentModule = null;
    await showModules();
  });
}

function setupModuleModal() {
  const modal = document.getElementById('modal-knowledge-module')!;
  const closeBtn = document.getElementById('modal-knowledge-module-close')!;
  const submitBtn = document.getElementById('modal-knowledge-module-submit')!;

  document.getElementById('btn-knowledge-admin-add-module')?.addEventListener('click', () => {
    (document.getElementById('modal-knowledge-module-id') as HTMLInputElement).value = '';
    (document.getElementById('modal-knowledge-module-title') as HTMLInputElement).value = '';
    document.getElementById('modal-knowledge-module-msg')!.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  submitBtn.addEventListener('click', async () => {
    const moduleId = (document.getElementById('modal-knowledge-module-id') as HTMLInputElement).value.trim().toLowerCase().replace(/\s+/g, '-');
    const moduleTitle = (document.getElementById('modal-knowledge-module-title') as HTMLInputElement).value.trim();
    const msgEl = document.getElementById('modal-knowledge-module-msg')!;

    if (!moduleId || !moduleTitle) {
      msgEl.textContent = 'Todos los campos son obligatorios.';
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    // Create a placeholder item so the module appears
    const { error } = await supaClient.client.from('knowledge_content').insert({
      company_id: _companyId,
      module: moduleId,
      module_title: moduleTitle,
      concepto: 'Próximamente',
      enseñanza: 'Contenido en preparación.',
      ejemplo: '...',
      pregunta: '¿Listo para aprender?',
      opciones: ['Sí', 'No'],
      respuesta: 'Sí',
      orden: 1,
    });

    if (error) {
      msgEl.textContent = `Error: ${error.message}`;
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    await showModules();
  });
}

function setupItemModal() {
  const modal = document.getElementById('modal-knowledge-item')!;
  const closeBtn = document.getElementById('modal-knowledge-item-close')!;
  const submitBtn = document.getElementById('modal-knowledge-item-submit')!;

  document.getElementById('btn-knowledge-add-opcion')?.addEventListener('click', () => {
    const container = document.getElementById('conocimiento-opciones-container')!;
    const idx = container.querySelectorAll('.conocimiento-opcion-input').length + 1;
    const input = document.createElement('input');
    input.className = 'input conocimiento-opcion-input';
    input.placeholder = `Opción ${idx}`;
    container.appendChild(input);
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  submitBtn.addEventListener('click', async () => {
    const id = (document.getElementById('modal-knowledge-item-id') as HTMLInputElement).value;
    const concepto = (document.getElementById('modal-knowledge-item-concepto') as HTMLInputElement).value.trim();
    const enseñanza = (document.getElementById('modal-knowledge-item-ensenanza') as HTMLTextAreaElement).value.trim();
    const ejemplo = (document.getElementById('modal-knowledge-item-ejemplo') as HTMLTextAreaElement).value.trim();
    const pregunta = (document.getElementById('modal-knowledge-item-pregunta') as HTMLInputElement).value.trim();
    const opciones = Array.from(document.querySelectorAll('.conocimiento-opcion-input'))
      .map((el: any) => (el as HTMLInputElement).value.trim())
      .filter(Boolean);
    const respuesta = (document.getElementById('modal-knowledge-item-respuesta') as HTMLInputElement).value.trim();
    const msgEl = document.getElementById('modal-knowledge-item-msg')!;

    if (!concepto || !enseñanza || !ejemplo || !pregunta || opciones.length < 2 || !respuesta) {
      msgEl.textContent = 'Todos los campos son obligatorios (mínimo 2 opciones).';
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    if (!opciones.includes(respuesta)) {
      msgEl.textContent = 'La respuesta debe coincidir exactamente con una de las opciones.';
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    // order: find max + 1
    const { data: existing } = await supaClient.client.from('knowledge_content')
      .select('orden')
      .eq('company_id', _companyId)
      .eq('module', _currentModule)
      .order('orden', { ascending: false })
      .limit(1);

    const nextOrder = (existing && existing.length > 0 ? existing[0].orden : 0) + 1;

    const payload: any = {
      company_id: _companyId,
      module: _currentModule,
      module_title: document.getElementById('knowledge-admin-module-title')!.textContent || _currentModule,
      concepto,
      enseñanza,
      ejemplo,
      pregunta,
      opciones,
      respuesta,
      orden: id ? undefined : nextOrder,
    };

    let error: any;
    if (id) {
      payload.orden = undefined;
      ({ error } = await supaClient.client.from('knowledge_content').update(payload).eq('id', id));
    } else {
      ({ error } = await supaClient.client.from('knowledge_content').insert(payload));
    }

    if (error) {
      msgEl.textContent = `Error: ${error.message}`;
      msgEl.className = 'text-sm text-center mt-3 text-red-400';
      msgEl.classList.remove('hidden');
      return;
    }

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    await showModuleDetail(_currentModule!);
  });
}

// ── Modules List ──────────────────────────────────────────────────────────

async function showModules() {
  const container = document.getElementById('knowledge-admin-modules')!;
  const detail = document.getElementById('knowledge-admin-module-detail')!;
  container.classList.remove('hidden');
  detail.classList.add('hidden');

  if (!_companyId) {
    container.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Selecciona una empresa.</p>';
    return;
  }

  container.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Cargando...</p>';

  const { data: rows } = await supaClient.client.from('knowledge_content')
    .select('module, module_title, orden')
    .eq('company_id', _companyId)
    .order('module')
    .order('orden');

  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">No hay módulos de conocimiento para esta empresa. Crea el primero.</p>';
    return;
  }

  const modMap: Record<string, { title: string; total: number }> = {};
  for (const r of rows) {
    if (!modMap[r.module]) {
      modMap[r.module] = { title: r.module_title, total: 0 };
    }
    modMap[r.module].total++;
  }

  container.innerHTML = Object.entries(modMap).map(([modId, info]) => `
    <div class="card p-5 cursor-pointer hover:border-primary/50 transition-all knowledge-admin-module-card" data-module="${modId}">
      <h3 class="font-orbitron text-lg font-bold text-white mb-1">${info.title}</h3>
      <p class="text-xs text-gray-400">${info.total} ${info.total === 1 ? 'item' : 'items'}</p>
      <p class="text-[10px] text-gray-600 mt-1 font-mono">${modId}</p>
    </div>
  `).join('');

  container.querySelectorAll('.knowledge-admin-module-card').forEach(el => {
    el.addEventListener('click', () => showModuleDetail((el as HTMLElement).dataset.module!));
  });
}

// ── Module Detail ─────────────────────────────────────────────────────────

async function showModuleDetail(moduleId: string) {
  _currentModule = moduleId;
  const container = document.getElementById('knowledge-admin-modules')!;
  const detail = document.getElementById('knowledge-admin-module-detail')!;
  const titleEl = document.getElementById('knowledge-admin-module-title')!;
  const tbody = document.getElementById('knowledge-admin-items-body')!;

  container.classList.add('hidden');
  detail.classList.remove('hidden');

  titleEl.textContent = moduleId;

  tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Cargando...</td></tr>';

  const { data: items } = await supaClient.client.from('knowledge_content')
    .select('*')
    .eq('company_id', _companyId)
    .eq('module', moduleId)
    .order('orden');

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Este módulo está vacío.</td></tr>';
    return;
  }

  titleEl.textContent = items[0].module_title || moduleId;

  tbody.innerHTML = items.map((item: any, _i: number) => `
    <tr class="border-b border-white/5 hover:bg-white/3 transition-colors">
      <td class="p-3 text-gray-500 text-xs">${item.orden}</td>
      <td class="p-3">
        <p class="text-sm text-white font-medium">${item.concepto}</p>
        <p class="text-[10px] text-gray-500 mt-0.5 line-clamp-1">${item.enseñanza.substring(0, 100)}${item.enseñanza.length > 100 ? '...' : ''}</p>
      </td>
      <td class="p-3 text-gray-400 text-xs">${item.pregunta}</td>
      <td class="p-3">
        <div class="flex gap-1">
          <button onclick="window._editKnowledgeItem('${item.id}')"
            class="px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-white/10 text-gray-300 hover:text-white hover:border-white/30 rounded-lg transition-all">
            Editar
          </button>
          <button onclick="window._deleteKnowledgeItem('${item.id}')"
            class="px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  (window as any)._editKnowledgeItem = (itemId: string) => {
    const item = items.find((i: any) => i.id === itemId);
    if (item) { openItemModal(item); }
  };

  (window as any)._deleteKnowledgeItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este item?')) { return; }
    await supaClient.client.from('knowledge_content').delete().eq('id', itemId);
    await showModuleDetail(_currentModule!);
  };
}

// ── Item Modal ────────────────────────────────────────────────────────────

function openItemModal(item: any | null) {
  const modal = document.getElementById('modal-knowledge-item')!;
  const titleEl = document.getElementById('modal-knowledge-item-title')!;
  const msgEl = document.getElementById('modal-knowledge-item-msg')!;

  (document.getElementById('modal-knowledge-item-id') as HTMLInputElement).value = item?.id || '';
  (document.getElementById('modal-knowledge-item-concepto') as HTMLInputElement).value = item?.concepto || '';
  (document.getElementById('modal-knowledge-item-ensenanza') as HTMLTextAreaElement).value = item?.enseñanza || '';
  (document.getElementById('modal-knowledge-item-ejemplo') as HTMLTextAreaElement).value = item?.ejemplo || '';
  (document.getElementById('modal-knowledge-item-pregunta') as HTMLInputElement).value = item?.pregunta || '';
  const container = document.getElementById('conocimiento-opciones-container')!;
  container.innerHTML = '';
  const opts = item?.opciones || [''];
  opts.forEach((o: string) => {
    const input = document.createElement('input');
    input.className = 'input conocimiento-opcion-input';
    input.placeholder = `Opción ${container.children.length + 1}`;
    input.value = o || '';
    container.appendChild(input);
  });
  if (opts.length === 0) {
    const input = document.createElement('input');
    input.className = 'input conocimiento-opcion-input';
    input.placeholder = 'Opción 1';
    container.appendChild(input);
  }
  (document.getElementById('modal-knowledge-item-respuesta') as HTMLInputElement).value = item?.respuesta || '';

  titleEl.textContent = item ? 'EDITAR ITEM' : 'AÑADIR ITEM';
  msgEl.classList.add('hidden');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
