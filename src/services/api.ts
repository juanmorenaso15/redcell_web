import type {
  ActualizarPerfilDTO,
  AlertaRecordatorio,
  ConfiguracionTarifa,
  PerfilUsuario,
  Poliza,
  PolizaUpdateDTO,
  RegistroUsuarioDTO,
  UsuarioSistema,
} from '../types/soat';

export interface PageResponse<T> {
  content: T[];
  number: number; // página actual (0-indexed en Spring Data)
  size: number; // tamaño de página (10 por defecto)
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ListarPolizasParams {
  page?: number;
  size?: number;
  q?: string;
  aseguradora?: string;
  tipoVehiculo?: string;
  vigencia?: 'TODOS' | 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';
  soloActivas?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

const API_URL = import.meta.env.VITE_API_URL || 'https://redcell-soat-api.onrender.com';

function getHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem('redcell_token');
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error en la solicitud' }));
    throw new Error(err.message || `Error HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<string> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ token: string }>(res);
    localStorage.setItem('redcell_token', data.token);
    localStorage.removeItem('redcell_perfil');
    return data.token;
  },

  logout: () => {
    localStorage.removeItem('redcell_token');
    localStorage.removeItem('redcell_perfil');
  },

  solicitarRecuperacion: async (email: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(res);
  },

  restablecerContrasena: async (
    token: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ token, newPassword }),
    });
    return handleResponse<{ message: string }>(res);
  },

  obtenerPerfil: async (): Promise<PerfilUsuario> => {
    const res = await fetch(`${API_URL}/api/auth/perfil`, {
      headers: getHeaders(false),
    });
    const perfil = await handleResponse<PerfilUsuario>(res);
    localStorage.setItem('redcell_perfil', JSON.stringify(perfil));
    return perfil;
  },

  actualizarPerfil: async (dto: ActualizarPerfilDTO): Promise<PerfilUsuario> => {
    const res = await fetch(`${API_URL}/api/auth/perfil`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(dto),
    });
    const perfil = await handleResponse<PerfilUsuario>(res);
    localStorage.setItem('redcell_perfil', JSON.stringify(perfil));
    return perfil;
  },

  // Pólizas
  listarPolizasPaginadas: async (
    params: ListarPolizasParams = {}
  ): Promise<PageResponse<Poliza>> => {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 10));

    if (params.q && params.q.trim()) query.set('q', params.q.trim());
    if (params.aseguradora && params.aseguradora !== 'TODAS') {
      query.set('aseguradora', params.aseguradora);
    }
    if (params.tipoVehiculo && params.tipoVehiculo !== 'TODOS') {
      query.set('tipoVehiculo', params.tipoVehiculo);
    }
    if (params.vigencia && params.vigencia !== 'TODOS') {
      query.set('vigencia', params.vigencia);
    }
    if (params.soloActivas !== undefined) {
      query.set('soloActivas', String(params.soloActivas));
    }
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);

    const res = await fetch(`${API_URL}/api/polizas?${query.toString()}`, {
      headers: getHeaders(false),
    });
    return handleResponse<PageResponse<Poliza>>(res);
  },

  listarPolizas: async (): Promise<Poliza[]> => {
    const res = await fetch(`${API_URL}/api/polizas?page=0&size=10`, {
      headers: getHeaders(false),
    });
    const pageData = await handleResponse<PageResponse<Poliza>>(res);
    return pageData.content;
  },

  subirPdf: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/api/polizas/upload`, {
      method: 'POST',
      headers: getHeaders(false),
      body: formData,
    });
    return handleResponse<{ message: string }>(res);
  },

  actualizarPoliza: async (id: number, dto: PolizaUpdateDTO): Promise<Poliza> => {
    const res = await fetch(`${API_URL}/api/polizas/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(dto),
    });
    return handleResponse<Poliza>(res);
  },

  eliminarPoliza: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/polizas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    await handleResponse(res);
  },

  // Alertas y Recordatorios
  obtenerAlertas: async (): Promise<AlertaRecordatorio[]> => {
    const res = await fetch(`${API_URL}/api/polizas/alertas-recordatorios`, {
      headers: getHeaders(false),
    });
    return handleResponse<AlertaRecordatorio[]>(res);
  },

  marcarWhatsappEnviado: async (polizaId: number, tipo: string): Promise<void> => {
    const res = await fetch(
      `${API_URL}/api/polizas/${polizaId}/recordatorios/marcar-whatsapp-enviado?tipo=${encodeURIComponent(tipo)}`,
      { method: 'POST', headers: getHeaders(false) }
    );
    await handleResponse(res);
  },

  // Tarifas de uso de plataforma
  listarTarifas: async (): Promise<ConfiguracionTarifa[]> => {
    const res = await fetch(`${API_URL}/api/configuracion-tarifas`, {
      headers: getHeaders(false),
    });
    return handleResponse<ConfiguracionTarifa[]>(res);
  },

  crearTarifa: async (tarifa: Omit<ConfiguracionTarifa, 'id'>): Promise<ConfiguracionTarifa> => {
    const res = await fetch(`${API_URL}/api/configuracion-tarifas`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(tarifa),
    });
    return handleResponse<ConfiguracionTarifa>(res);
  },

  actualizarTarifa: async (
    id: number,
    tarifa: Partial<ConfiguracionTarifa>
  ): Promise<ConfiguracionTarifa> => {
    const res = await fetch(`${API_URL}/api/configuracion-tarifas/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(tarifa),
    });
    return handleResponse<ConfiguracionTarifa>(res);
  },

  eliminarTarifa: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/configuracion-tarifas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    await handleResponse(res);
  },

  notificarPoliza: async (
    id: number,
    payload: { telefono?: string; email?: string; whatsapp?: boolean; gmail?: boolean }
  ): Promise<{ estado: string; mensaje: string }> => {
    const res = await fetch(`${API_URL}/api/polizas/${id}/notificar`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ estado: string; mensaje: string }>(res);
  },

  registrarUsuario: async (dto: RegistroUsuarioDTO): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(dto),
    });
    return handleResponse<{ message: string }>(res);
  },

  listarUsuarios: async (): Promise<UsuarioSistema[]> => {
    const res = await fetch(`${API_URL}/api/auth/usuarios`, {
      method: 'GET',
      headers: getHeaders(true),
    });
    return handleResponse<UsuarioSistema[]>(res);
  },

  cambiarEstadoUsuario: async (id: number, activo: boolean): Promise<UsuarioSistema> => {
    const res = await fetch(
      `${API_URL}/api/auth/usuarios/${id}/estado?activo=${activo}`,
      {
        method: 'PATCH',
        headers: getHeaders(true),
      }
    );
    return handleResponse<UsuarioSistema>(res);
  },
};