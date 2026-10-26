import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

export function init() {
  const productModal = document.getElementById('product-modal')!;
  const productForm = document.getElementById('product-form') as HTMLFormElement | null;
  const productsGrid = document.getElementById('products-grid')!;

  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('product-modal-title')!.textContent = 'NUEVO PRODUCTO';
    productForm?.reset();
    (document.getElementById('product-id') as HTMLInputElement).value = '';
    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
  });

  document.getElementById('close-product-modal')?.addEventListener('click', () => {
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
  });

  loadProducts();

  productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = productForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'GUARDANDO...';

    const id = (document.getElementById('product-id') as HTMLInputElement).value;
    const name = (document.getElementById('product-name') as HTMLInputElement).value;
    const price = parseFloat((document.getElementById('product-price') as HTMLInputElement).value);

    try {
      const productData = { user_id: store.currentUser.id, name, price };
      let result;
      if (id) {result = await supaClient.client.from('products').update(productData).eq('id', id);}
      else {result = await supaClient.client.from('products').insert([productData]);}
      if (result.error) {throw result.error;}

      productModal.classList.add('hidden');
      productModal.classList.remove('flex');
      loadProducts();
    } catch (err: any) {
      alert("Error al guardar producto: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'GUARDAR PRODUCTO';
    }
  });

  async function loadProducts() {
    if (!store.currentUser) {return;}
    productsGrid.innerHTML = '<div class="col-span-full text-center py-10"><div class="loader mx-auto"></div><p class="text-gray-400 mt-4 uppercase tracking-widest text-[10px]">Sincronizando Catálogo...</p></div>';

    try {
      const { data, error } = await supaClient.client
        .from('products')
        .select('*')
        .eq('user_id', store.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {throw error;}

      if (!data || data.length === 0) {
        productsGrid.innerHTML = `
          <div class="col-span-full card p-12 text-center border-dashed border-2 border-white/10">
            <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
            </div>
            <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">No tienes productos registrados</p>
            <p class="text-gray-500 text-[10px] mt-1">Crea tu primer producto para empezar a vender</p>
          </div>`;
        return;
      }

      productsGrid.innerHTML = data.map((p: any) => `
        <div class="card p-6 border-white/5 bg-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
          <div class="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path></svg>
            </div>
            <div class="flex gap-2">
              <button onclick="window.editProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price})" class="p-2 text-gray-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
              </button>
              <button onclick="window.deleteProduct('${p.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
          <h4 class="text-white font-bold text-lg mb-1 relative z-10">${p.name}</h4>
          <p class="text-primary font-black font-rajdhani text-2xl relative z-10">$${parseFloat(p.price).toFixed(2)}</p>
        </div>
      `).join('');
    } catch (err: any) {
      console.error(err);
      productsGrid.innerHTML = `<div class="col-span-full p-8 text-center text-red-500 font-bold uppercase text-xs">Error al cargar productos: ${err.message}</div>`;
    }
  }

  (window as any).editProduct = (id: string, name: string, price: number) => {
    document.getElementById('product-modal-title')!.textContent = 'EDITAR PRODUCTO';
    (document.getElementById('product-id') as HTMLInputElement).value = id;
    (document.getElementById('product-name') as HTMLInputElement).value = name;
    (document.getElementById('product-price') as HTMLInputElement).value = String(price);
    productModal.classList.remove('hidden');
    productModal.classList.add('flex');
  };

  (window as any).deleteProduct = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) {return;}
    try {
      const { error } = await supaClient.client.from('products').delete().eq('id', id);
      if (error) {throw error;}
      loadProducts();
    } catch (err: any) {
      alert("Error al eliminar producto: " + err.message);
    }
  };
}
