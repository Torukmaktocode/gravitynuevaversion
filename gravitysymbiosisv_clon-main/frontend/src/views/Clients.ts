import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

export function init() {
  const clientModal = document.getElementById('client-modal')!;
  const clientForm = document.getElementById('client-form') as HTMLFormElement | null;
  const clientsGrid = document.getElementById('clients-grid')!;
  const saleModal = document.getElementById('sale-modal')!;
  const saleForm = document.getElementById('sale-form') as HTMLFormElement | null;

  document.getElementById('add-client-btn')?.addEventListener('click', () => {
    document.getElementById('client-modal-title')!.textContent = 'NUEVO CLIENTE';
    clientForm?.reset();
    (document.getElementById('client-id') as HTMLInputElement).value = '';
    clientModal.classList.remove('hidden');
    clientModal.classList.add('flex');
  });

  document.querySelectorAll('#close-client-modal, #close-sale-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      clientModal.classList.add('hidden');
      clientModal.classList.remove('flex');
      saleModal.classList.add('hidden');
      saleModal.classList.remove('flex');
    });
  });

  let clientsFilter = 'all';
  document.getElementById('clients-filter')?.addEventListener('change', (e) => {
    clientsFilter = (e.target as HTMLSelectElement).value;
    loadClients();
  });

  loadClients();

  clientForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = clientForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    btn.disabled = true;

    const id = (document.getElementById('client-id') as HTMLInputElement).value;
    const clientData = {
      user_id: store.currentUser.id,
      first_name: (document.getElementById('client-first-name') as HTMLInputElement).value,
      last_name: (document.getElementById('client-last-name') as HTMLInputElement).value,
      email: (document.getElementById('client-email') as HTMLInputElement).value,
      phone: (document.getElementById('client-phone') as HTMLInputElement).value
    };

    try {
      let result;
      if (id) {result = await supaClient.client.from('clients').update(clientData).eq('id', id);}
      else {result = await supaClient.client.from('clients').insert([clientData]);}
      if (result.error) {throw result.error;}

      clientModal.classList.add('hidden');
      clientModal.classList.remove('flex');
      loadClients();
    } catch (err: any) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  saleForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = saleForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    btn.disabled = true;

    const clientId = (document.getElementById('sale-client-id') as HTMLInputElement).value;
    const checkboxes = document.querySelectorAll('input[name="sale_product"]:checked') as NodeListOf<HTMLInputElement>;

    if (checkboxes.length === 0) {
      alert("Selecciona al menos un producto");
      btn.disabled = false;
      return;
    }

    try {
      const { data: sale, error: saleErr } = await supaClient.client.from('sales').insert([{
        user_id: store.currentUser.id,
        client_id: clientId
      }]).select().single();

      if (saleErr) {throw saleErr;}

      const items = Array.from(checkboxes).map(cb => ({
        sale_id: sale.id,
        product_id: cb.value,
        price: parseFloat(cb.dataset.price!)
      }));

      const { error: itemsErr } = await supaClient.client.from('sale_items').insert(items);
      if (itemsErr) {throw itemsErr;}

      saleModal.classList.add('hidden');
      saleModal.classList.remove('flex');
      loadClients();

      const toast = document.getElementById('achievement-toast')!;
      document.getElementById('toast-achievement-name')!.textContent = "CIERRE EXITOSO";
      document.getElementById('toast-achievement-desc')!.textContent = "Venta registrada correctamente.";
      document.getElementById('toast-achievement-points')!.textContent = "+100 PTS";
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  async function loadClients() {
    if (!store.currentUser) {return;}
    clientsGrid.innerHTML = '<div class="col-span-full text-center py-10"><div class="loader mx-auto"></div></div>';

    try {
      const { data: clients, error } = await supaClient.client
        .from('clients')
        .select('*, sales (id), objections (*)')
        .eq('user_id', store.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {throw error;}

      let filteredClients = clients || [];
      if (clientsFilter === 'closed') {
        filteredClients = filteredClients.filter((c: any) => c.sales && c.sales.length > 0);
      } else if (clientsFilter === 'prospect') {
        filteredClients = filteredClients.filter((c: any) => !c.sales || c.sales.length === 0);
      }

      if (filteredClients.length === 0) {
        clientsGrid.innerHTML = `<div class="col-span-full card p-12 text-center border-dashed border-2 border-white/10 text-gray-500 uppercase font-bold text-xs tracking-widest">Sin clientes en esta categoría</div>`;
        return;
      }

      clientsGrid.innerHTML = filteredClients.map((c: any) => {
        const hasActiveObjection = c.objections?.some((o: any) => o.status === 'pending');
        const closedSales = c.sales?.length || 0;

        return `
        <div class="card p-6 border-white/5 bg-white/5 hover:border-blue-500/30 transition-all group">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl font-orbitron">
              ${c.first_name[0]}${c.last_name[0]}
            </div>
            <div class="flex gap-1">
              <button onclick="window.editClient('${c.id}')" class="p-1.5 text-gray-500 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg></button>
              <button onclick="window.deleteClient('${c.id}')" class="p-1.5 text-gray-500 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg></button>
            </div>
          </div>
          <h4 class="text-white font-bold text-lg leading-tight">${c.first_name} ${c.last_name}</h4>
          <div class="space-y-1 mt-2 mb-6">
            ${c.email ? `<p class="text-[10px] text-gray-400 font-mono">${c.email}</p>` : ''}
            ${c.phone ? `<p class="text-[10px] text-gray-400 font-mono">${c.phone}</p>` : ''}
          </div>
          <div class="grid grid-cols-2 gap-2 mb-6">
            <div class="bg-black/20 rounded-xl p-3 border border-white/5">
              <p class="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Ventas</p>
              <p class="text-xl font-black text-white font-rajdhani">${closedSales}</p>
            </div>
            <div class="bg-black/20 rounded-xl p-3 border border-white/5">
              <p class="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Status</p>
              <p class="text-[10px] font-bold ${closedSales > 0 ? 'text-primary' : 'text-blue-400'} uppercase">${closedSales > 0 ? 'CERRADO' : 'PROSPECTO'}</p>
            </div>
          </div>
          <div class="space-y-2">
            <button onclick="window.openSaleModal('${c.id}', '${c.first_name} ${c.last_name}')" class="w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all border border-primary/20">
              REGISTRAR VENTA
            </button>
            ${hasActiveObjection ? `
              <button onclick="window.resolveObjection('${c.id}')" class="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all border border-yellow-500/20">
                RESOLVER OBJECIÓN
              </button>
            ` : `
              <button onclick="window.createObjection('${c.id}')" class="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all border border-white/5">
                CREAR OBJECIÓN
              </button>
            `}
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      console.error(err);
    }
  }

  (window as any).editClient = async (id: string) => {
    const { data } = await supaClient.client.from('clients').select('*').eq('id', id).single();
    if (data) {
      document.getElementById('client-modal-title')!.textContent = 'EDITAR CLIENTE';
      (document.getElementById('client-id') as HTMLInputElement).value = data.id;
      (document.getElementById('client-first-name') as HTMLInputElement).value = data.first_name;
      (document.getElementById('client-last-name') as HTMLInputElement).value = data.last_name;
      (document.getElementById('client-email') as HTMLInputElement).value = data.email || '';
      (document.getElementById('client-phone') as HTMLInputElement).value = data.phone || '';
      clientModal.classList.remove('hidden');
      clientModal.classList.add('flex');
    }
  };

  (window as any).deleteClient = async (id: string) => {
    if (!confirm("¿Eliminar cliente?")) {return;}
    await supaClient.client.from('clients').delete().eq('id', id);
    loadClients();
  };

  (window as any).createObjection = async (clientId: string) => {
    const { error } = await supaClient.client.from('objections').insert([{
      user_id: store.currentUser.id,
      client_id: clientId,
      status: 'pending'
    }]);
    if (error) {alert(error.message);}
    else {loadClients();}
  };

  (window as any).resolveObjection = async (clientId: string) => {
    const { error } = await supaClient.client.from('objections')
      .update({ status: 'resolved', resolved_at: new Date() })
      .eq('client_id', clientId)
      .eq('status', 'pending');
    if (error) {alert(error.message);}
    else {loadClients();}
  };

  (window as any).openSaleModal = async (clientId: string, clientName: string) => {
    (document.getElementById('sale-client-id') as HTMLInputElement).value = clientId;
    document.getElementById('sale-client-name')!.textContent = `CLIENTE: ${clientName}`;
    document.getElementById('sale-total-display')!.textContent = '$0.00';

    const list = document.getElementById('sale-products-list')!;
    list.innerHTML = '<p class="text-center p-4 text-[10px] text-gray-500 uppercase font-bold">Cargando catálogo...</p>';

    saleModal.classList.remove('hidden');
    saleModal.classList.add('flex');

    const { data: products } = await supaClient.client.from('products').select('*').eq('user_id', store.currentUser.id);

    if (!products || products.length === 0) {
      list.innerHTML = '<p class="text-center p-4 text-[10px] text-red-400 uppercase font-bold">No tienes productos creados</p>';
      return;
    }

    list.innerHTML = products.map((p: any) => `
      <label class="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
        <div class="flex items-center gap-3">
          <input type="checkbox" name="sale_product" value="${p.id}" data-price="${p.price}" class="w-4 h-4 rounded border-white/10 text-primary bg-black/40 focus:ring-primary" onchange="window.updateSaleTotal()">
          <span class="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">${p.name}</span>
        </div>
        <span class="text-primary font-black font-rajdhani">$${parseFloat(p.price).toFixed(2)}</span>
      </label>
    `).join('');
  };

  (window as any).updateSaleTotal = () => {
    const checkboxes = document.querySelectorAll('input[name="sale_product"]:checked') as NodeListOf<HTMLInputElement>;
    let total = 0;
    checkboxes.forEach(cb => total += parseFloat(cb.dataset.price!));
    document.getElementById('sale-total-display')!.textContent = `$${total.toFixed(2)}`;
  };
}
