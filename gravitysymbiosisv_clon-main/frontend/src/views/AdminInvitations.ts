import { supaClient } from '../api/supa-client.js';

export async function init() {
  const company = await supaClient.getMyCompany();
  if (!company) {return;}

  const invitations = await supaClient.getCompanyInvitations(company.id);
  const tbody = document.getElementById('invitations-table-body');
  if (!tbody) {return;}

  if (!invitations || invitations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400 text-sm">No hay invitaciones aún. Crea una nueva.</td></tr>';
    return;
  }

  tbody.innerHTML = invitations.map((inv: any) => {
    const isPending = !inv.accepted_at && new Date(inv.expires_at) > new Date();
    const isExpired = !inv.accepted_at && new Date(inv.expires_at) <= new Date();
    const isAccepted = !!inv.accepted_at;
    let status: string, statusClass: string;
    if (isAccepted) { status = 'Aceptada'; statusClass = 'text-violet-400'; }
    else if (isExpired) { status = 'Expirada'; statusClass = 'text-red-400'; }
    else { status = 'Pendiente'; statusClass = 'text-yellow-400'; }
    return `<tr class="border-b border-gray-800">
      <td class="p-4 text-gray-300">${inv.email}</td>
      <td class="p-4"><span class="text-[10px] uppercase font-bold ${inv.role === 'admin' ? 'text-primary' : 'text-gray-400'}">${inv.role === 'admin' ? 'Admin' : 'Usuario'}</span></td>
      <td class="p-4"><span class="text-xs font-bold ${statusClass}">${status}</span></td>
      <td class="p-4 text-gray-400 text-xs">${new Date(inv.created_at).toLocaleDateString()}</td>
      <td class="p-4">${isPending ? `<button class="text-xs text-red-400 hover:text-red-300 underline" data-invitation-id="${inv.id}">Revocar</button>` : '<span class="text-gray-600 text-xs">—</span>'}</td>
    </tr>`;
  }).join('');

  // Event delegation for revoke buttons
  tbody.addEventListener('click', async (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.tagName === 'BUTTON' && target.dataset.invitationId) {
      const invId = target.dataset.invitationId;
      if (confirm('¿Estás seguro de revocar esta invitación?')) {
        target.disabled = true;
        target.textContent = 'Revocando...';
        const { error } = await supaClient.revokeInvitation(invId);
        if (error) {
          alert('Error al revocar: ' + error.message);
          target.disabled = false;
          target.textContent = 'Revocar';
        } else {
          // Refresh the list
          await init();
        }
      }
    }
  });
}
