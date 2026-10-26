export type RecoveryParams = {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  isRecovery: boolean;
};

function hashSearchParams(href: string): URLSearchParams {
  try {
    const url = new URL(href);
    const raw = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    return new URLSearchParams(raw);
  } catch {
    return new URLSearchParams();
  }
}

function isResetPasswordPath(pathname: string): boolean {
  return pathname === '/reset-password' || pathname.endsWith('/reset-password');
}

export function parseRecoveryParams(href: string): RecoveryParams {
  try {
    const url = new URL(href);
    const hashParams = hashSearchParams(href);
    const tokenHash = url.searchParams.get('token_hash') || hashParams.get('token_hash');
    const type = url.searchParams.get('type') || hashParams.get('type');
    const code = url.searchParams.get('code') || hashParams.get('code');
    const hasImplicitRecovery = type === 'recovery' || hashParams.has('access_token');
    const isRecovery = hasImplicitRecovery || !!tokenHash || (isResetPasswordPath(url.pathname) && !!code);
    return { tokenHash, type, code, isRecovery };
  } catch {
    return { tokenHash: null, type: null, code: null, isRecovery: false };
  }
}

/** True while the user is on the reset-password step (path or recovery tokens in the URL). */
export function isPasswordRecoveryLocation(href: string): boolean {
  try {
    const url = new URL(href);
    if (isResetPasswordPath(url.pathname)) { return true; }
  } catch {
    /* ignore malformed href */
  }
  return parseRecoveryParams(href).isRecovery;
}

export function hasExpiredRecoveryLink(href: string): boolean {
  try {
    const url = new URL(href);
    const hashParams = hashSearchParams(href);
    const errorCode = url.searchParams.get('error_code') || hashParams.get('error_code');
    if (errorCode === 'otp_expired') { return true; }
  } catch {
    /* fall through */
  }
  return href.includes('error_code=otp_expired');
}

export function mapPasswordResetError(message: string | undefined | null): string {
  const raw = (message || '').trim();
  const m = raw.toLowerCase();
  if (!m || m.includes('auth session missing') || m.includes('session missing') || m.includes('session_not_found')) {
    return 'El enlace de recuperación no es válido o ya se usó. Solicita uno nuevo y ábrelo en el mismo navegador donde pediste el cambio.';
  }
  if (m.includes('otp_expired') || m.includes('expired') || m.includes('invalid token')) {
    return 'El enlace expiró. Solicita uno nuevo para restablecer tu contraseña.';
  }
  if (m.includes('same password') || m.includes('different from the old') || m.includes('should be different')) {
    return 'La nueva contraseña debe ser distinta a la anterior.';
  }
  return raw;
}
