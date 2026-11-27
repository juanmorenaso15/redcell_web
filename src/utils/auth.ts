export interface UsuarioSesion {
  nombre: string;
  rol: string;
  username: string;
  email?: string;
}

function decodificarPayloadJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length < 2) return null;

  try {
    const base64Url = partes[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const parsed = JSON.parse(jsonStr);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function formatearRol(rawRol: unknown): string {
  if (!rawRol) return 'Operador';
  const texto = Array.isArray(rawRol) ? String(rawRol[0] ?? '') : String(rawRol);
  const limpio = texto.replace(/^ROLE_/i, '').replace(/[_-]+/g, ' ').trim();
  if (!limpio) return 'Operador';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

export function obtenerUsuarioSesion(): UsuarioSesion {
  const cachedRaw = localStorage.getItem('redcell_perfil');
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as {
        username?: string;
        email?: string;
        rol?: string;
      };
      if (cached?.username) {
        const cleanUser = cached.username.replace(/^@+/, '').trim() || 'usuario';
        return {
          nombre: cleanUser,
          username: `@${cleanUser}`,
          rol: formatearRol(cached.rol),
          email: cached.email,
        };
      }
    } catch {
      // Ignorar JSON inválido y caer en JWT
    }
  }

  const token = localStorage.getItem('redcell_token');
  const payload = decodificarPayloadJwt(token);

  const rawEmailOrSub =
    (typeof payload?.email === 'string' && payload.email) ||
    (typeof payload?.username === 'string' && payload.username) ||
    (typeof payload?.sub === 'string' && payload.sub) ||
    'usuario@redcell.com';

  const baseUsername = rawEmailOrSub.includes('@')
    ? rawEmailOrSub.split('@')[0]
    : rawEmailOrSub;

  const username = `@${baseUsername.replace(/^@+/, '').trim() || 'usuario'}`;

  const nombre =
    (typeof payload?.nombre === 'string' && payload.nombre.trim()) ||
    (typeof payload?.name === 'string' && payload.name.trim()) ||
    baseUsername
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim() ||
    'Usuario RedCell';

  const rol = formatearRol(payload?.rol ?? payload?.role ?? payload?.authorities);

  return {
    nombre,
    rol,
    username,
    email: typeof payload?.email === 'string' ? payload.email : undefined,
  };
}