import { store } from '../lib/store.js';
import { supaClient } from '../api/supa-client.js';
import { getDisplayName } from '../lib/utils.js';

export async function init() {
  if (!store.currentUser) { return; }

  let profile;
  const { data: initialProfile, error } = await supaClient.getProfile(store.currentUser.id);
  profile = initialProfile;

  // Si no existe el perfil, lo creamos con datos básicos
  if (!profile || error) {
    const { data: newProfile } = await supaClient.updateProfile(store.currentUser.id, {
      email: store.currentUser.email,
      role: 'user',
      updated_at: new Date().toISOString(),
    });
    profile = newProfile?.[0] ?? { id: store.currentUser.id, email: store.currentUser.email };
  }

  (document.getElementById('profile-first-name') as HTMLInputElement).value = profile.first_name || '';
  (document.getElementById('profile-last-name') as HTMLInputElement).value = profile.last_name || '';
  (document.getElementById('profile-nickname') as HTMLInputElement).value = profile.nickname || '';
  (document.getElementById('profile-email-readonly') as HTMLInputElement).value = store.currentUser.email;
  (document.getElementById('profile-bio') as HTMLTextAreaElement).value = profile.bio || '';

  document.getElementById('profile-info-name')!.textContent = getDisplayName(profile, store.currentUser.email) || 'Agente';
  document.getElementById('profile-info-email')!.textContent = store.currentUser.email;
  const role = store.currentProfile?.role === 'admin' || store.currentProfile?.role === 'super_admin' ? 'ADMINISTRADOR' : 'AGENTE';
  document.getElementById('profile-info-role')!.textContent = role;

  const previewImg = document.getElementById('profile-preview-img') as HTMLImageElement;
  const previewInitial = document.getElementById('profile-preview-initial')!;
  if (profile.avatar_url) {
    previewImg.src = profile.avatar_url;
    previewImg.classList.remove('hidden');
    previewInitial.classList.add('hidden');
  } else {
    previewImg.classList.add('hidden');
    previewInitial.classList.remove('hidden');
    previewInitial.textContent = (profile.email || store.currentUser.email || 'U').charAt(0).toUpperCase();
  }

  // Handler del formulario — previene reload de página que borraba los datos
  const form = document.getElementById('profile-form') as HTMLFormElement;
  const statusEl = document.getElementById('profile-save-status')!;

  // Remover listener previo si init() se llama más de una vez
  const newForm = form?.cloneNode(true) as HTMLFormElement;
  form?.parentNode?.replaceChild(newForm, form);

  newForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = (document.getElementById('profile-first-name') as HTMLInputElement).value.trim();
    const lastName  = (document.getElementById('profile-last-name') as HTMLInputElement).value.trim();
    const nickname  = (document.getElementById('profile-nickname') as HTMLInputElement).value.trim();
    const bio       = (document.getElementById('profile-bio') as HTMLTextAreaElement).value.trim();

    statusEl.textContent = 'Guardando...';
    statusEl.className = 'text-sm font-bold animate-pulse text-blue-400';
    statusEl.classList.remove('hidden');

    const { error: saveError } = await supaClient.updateProfile(store.currentUser!.id, {
      first_name: firstName,
      last_name: lastName,
      nickname,
      bio,
      updated_at: new Date().toISOString(),
    });

    if (saveError) {
      statusEl.textContent = `Error: ${saveError.message}`;
      statusEl.className = 'text-sm font-bold text-red-400';
    } else {
      statusEl.textContent = '¡Perfil guardado correctamente!';
      statusEl.className = 'text-sm font-bold text-violet-400';
      document.getElementById('profile-info-name')!.textContent = nickname || firstName || 'Agente';
      if (store.currentProfile) {
        store.currentProfile.first_name = firstName;
        store.currentProfile.last_name = lastName;
        store.currentProfile.nickname = nickname;
        store.currentProfile.bio = bio;
      }
    }

    setTimeout(() => statusEl.classList.add('hidden'), 3000);
  });
}
