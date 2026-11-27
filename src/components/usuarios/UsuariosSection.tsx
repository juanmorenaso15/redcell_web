import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { evaluarPassword, PasswordRequisitos } from '../auth/PasswordRequisitos';
import { api } from '../../services/api';
import type { UsuarioSistema } from '../../types/soat';
import { alertasSwal } from '../../utils/alerts';

interface UsuariosSectionProps {
  onIrAConfiguracion: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{4,20}$/;

const ROLES_DISPONIBLES = [
  {
    value: 'ADMIN',
    label: 'Administrador (ADMIN)',
    desc: 'Acceso completo al sistema, tarifas y gestión de equipo.',
  },
  {
    value: 'OPERADOR',
    label: 'Operador (OPERADOR)',
    desc: 'Gestión de pólizas SOAT, PDFs y recordatorios.',
  },
] as const;

const controlStyle = {
  height: '2.5rem',
  lineHeight: '1.25rem',
} as const;

const cardHeaderStyle = {
  padding: '1.1rem 1.75rem',
} as const;

const cellStyle = {
  padding: '1rem 1.75rem',
} as const;

export function UsuariosSection({ onIrAConfiguracion }: UsuariosSectionProps) {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [sinPermisosListado, setSinPermisosListado] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [rol, setRol] = useState<string>('OPERADOR');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const cargarUsuarios = useCallback(async () => {
    setLoadingUsuarios(true);
    try {
      const data = await api.listarUsuarios();
      setUsuarios(data);
      setSinPermisosListado(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('403') || msg.toLowerCase().includes('permisos')) {
        setSinPermisosListado(true);
      } else {
        await alertasSwal.error(
          'No se pudieron cargar los usuarios',
          msg || 'Error al consultar el listado de usuarios.'
        );
      }
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const handleToggleEstado = async (u: UsuarioSistema) => {
    const estaActivo = u.estado ?? true;
    const nuevoEstado = !estaActivo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const confirmado = await alertasSwal.confirmar(
      `¿${nuevoEstado ? 'Activar' : 'Desactivar'} usuario?`,
      `¿Deseas ${accion} a ${u.username}? ${
        !nuevoEstado ? 'No podrá iniciar sesión mientras esté desactivado.' : ''
      }`
    );
    if (!confirmado) return;

    setCambiandoId(u.id);
    try {
      await api.cambiarEstadoUsuario(u.id, nuevoEstado);
      await alertasSwal.exito(
        'Estado actualizado',
        `El usuario ${u.username} ahora está ${nuevoEstado ? 'activo' : 'desactivado'}.`
      );
      await cargarUsuarios();
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo actualizar el estado',
        err instanceof Error ? err.message : 'Intenta nuevamente.'
      );
    } finally {
      setCambiandoId(null);
    }
  };

  const emailValido = EMAIL_REGEX.test(email.trim());
  const usernameValido = USERNAME_REGEX.test(username.trim());
  const passwordEval = useMemo(() => evaluarPassword(password), [password]);
  const confirmValido = password.length > 0 && password === confirmPassword;

  const errorEmail =
    touched.email && !emailValido ? 'Ingresa un correo electrónico válido.' : null;

  const errorUsername =
    touched.username && !usernameValido
      ? 'Entre 4 y 20 caracteres (letras, números, punto, guion o guion bajo).'
      : null;

  const errorConfirm =
    touched.confirm && confirmPassword.length > 0 && !confirmValido
      ? 'Las contraseñas no coinciden.'
      : null;

  const marcar = (campo: string) => setTouched((prev) => ({ ...prev, [campo]: true }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, username: true, password: true, confirm: true });

    if (!emailValido) {
      await alertasSwal.advertencia('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    if (!usernameValido) {
      await alertasSwal.advertencia(
        'Usuario inválido',
        'El nombre de usuario debe tener entre 4 y 20 caracteres.'
      );
      return;
    }
    if (!passwordEval.esValida) {
      await alertasSwal.advertencia(
        'Contraseña no cumple requisitos',
        'Completa todos los requisitos de seguridad de la contraseña.'
      );
      return;
    }
    if (!confirmValido) {
      await alertasSwal.advertencia(
        'Las contraseñas no coinciden',
        'Verifica que la contraseña y su confirmación sean iguales.'
      );
      return;
    }

    const emailLimpio = email.trim().toLowerCase();
    const userLimpio = username.trim();

    setSubmitting(true);
    try {
      const res = await api.registrarUsuario({
        email: emailLimpio,
        username: userLimpio,
        password,
        rol,
      });

      setEmail('');
      setUsername('');
      setRol('OPERADOR');
      setPassword('');
      setConfirmPassword('');
      setTouched({});

      await alertasSwal.exito(
        'Usuario registrado',
        res.message || `Se creó la cuenta para ${userLimpio} con rol ${rol}.`
      );
      await cargarUsuarios();
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo registrar el usuario',
        err instanceof Error ? err.message : 'Verifica que el correo o usuario no estén en uso.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const rolSeleccionado =
    ROLES_DISPONIBLES.find((r) => r.value === rol) ?? ROLES_DISPONIBLES[1];

  return (
    <section className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#0F172A]">
            <Users size={15} className="text-[#DC2626]" />
            Gestión de equipo y accesos
          </div>
          <h2 className="text-xl font-bold mt-1 mb-0 font-headline">
            Usuarios del sistema ({usuarios.length})
          </h2>
          <p className="text-xs text-[#64748B] mt-1 mb-0">
            Consulta los usuarios registrados, controla su acceso y crea nuevas cuentas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarUsuarios}
            disabled={loadingUsuarios}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
          >
            <RefreshCw size={14} className={loadingUsuarios ? 'animate-spin' : ''} />
            Actualizar lista
          </button>

          <button
            type="button"
            onClick={onIrAConfiguracion}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
          >
            <ShieldCheck size={14} className="text-[#0F172A]" />
            Ver mi perfil
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div
          style={cardHeaderStyle}
          className="border-b border-[#E2E8F0] flex items-center justify-between gap-4"
        >
          <h3 className="text-base font-bold text-[#0F172A] m-0 font-headline">
            Usuarios registrados
          </h3>
          <span
            style={{ padding: '0.3rem 0.75rem' }}
            className="rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#0F172A] whitespace-nowrap"
          >
            {loadingUsuarios ? 'Cargando...' : `${usuarios.length} usuario(s)`}
          </span>
        </div>

        {sinPermisosListado ? (
          <div style={cellStyle} className="text-xs text-[#64748B]">
            Solo los usuarios con rol <strong>ADMIN</strong> pueden consultar el listado completo de usuarios.
          </div>
        ) : loadingUsuarios ? (
          <div style={cellStyle} className="text-sm text-[#64748B]">
            Cargando usuarios...
          </div>
        ) : usuarios.length === 0 ? (
          <div style={cellStyle} className="text-sm text-[#64748B]">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th style={cellStyle} className="w-24">
                    ID
                  </th>
                  <th style={cellStyle} className="w-44">
                    Usuario
                  </th>
                  <th style={cellStyle}>Correo electrónico</th>
                  <th style={cellStyle} className="w-32">
                    Rol
                  </th>
                  <th style={cellStyle} className="w-32">
                    Estado
                  </th>
                  <th style={cellStyle} className="w-36 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {usuarios.map((u) => {
                  const esAdmin = u.rol?.toUpperCase() === 'ADMIN';
                  const estaActivo = u.estado ?? true;

                  return (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td style={cellStyle} className="font-mono text-xs text-[#64748B]">
                        #{u.id}
                      </td>
                      <td style={cellStyle} className="font-semibold text-[#0F172A]">
                        {u.username}
                      </td>
                      <td style={cellStyle} className="text-[#334155]">
                        {u.email}
                      </td>
                      <td style={cellStyle}>
                        <span
                          style={{ padding: '0.28rem 0.75rem' }}
                          className={
                            esAdmin
                              ? 'inline-flex items-center rounded-full text-xs font-semibold bg-red-50 text-[#DC2626]'
                              : 'inline-flex items-center rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#0F172A]'
                          }
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <span
                          style={{ padding: '0.28rem 0.75rem' }}
                          className={
                            estaActivo
                              ? 'inline-flex items-center rounded-full text-xs font-semibold bg-emerald-50 text-[#15803D]'
                              : 'inline-flex items-center rounded-full text-xs font-semibold bg-slate-100 text-[#64748B]'
                          }
                        >
                          {estaActivo ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td style={cellStyle} className="text-right">
                        <button
                          type="button"
                          disabled={cambiandoId === u.id}
                          onClick={() => handleToggleEstado(u)}
                          style={{ padding: '0.35rem 0.8rem' }}
                          className={
                            estaActivo
                              ? 'rounded-lg border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-xs font-semibold text-[#DC2626] cursor-pointer disabled:opacity-60'
                              : 'rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] hover:bg-[#DCFCE7] text-xs font-semibold text-[#15803D] cursor-pointer disabled:opacity-60'
                          }
                        >
                          {cambiandoId === u.id
                            ? 'Guardando...'
                            : estaActivo
                              ? 'Desactivar'
                              : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
        >
          <h3 className="text-base font-bold m-0 font-headline">Agregar nuevo usuario</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={13} />
                  Correo electrónico
                </span>
              </label>
              <input
                type="email"
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => marcar('email')}
                placeholder="nuevo.usuario@redcell.com"
                style={{
                  ...controlStyle,
                  borderColor: errorEmail ? '#DC2626' : emailValido ? '#16A34A' : '#E2E8F0',
                }}
                className="w-full px-3 rounded-lg border text-sm outline-none bg-white"
              />
              {errorEmail && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Nombre de usuario{' '}
                <span className="text-[11px] font-normal text-[#64748B]">(4–20 car.)</span>
              </label>
              <input
                type="text"
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => marcar('username')}
                placeholder="Operador01"
                style={{
                  ...controlStyle,
                  borderColor: errorUsername ? '#DC2626' : usernameValido ? '#16A34A' : '#E2E8F0',
                }}
                className="w-full px-3 rounded-lg border text-sm font-semibold outline-none bg-white"
              />
              {errorUsername && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorUsername}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Rol en la plataforma</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              style={controlStyle}
              className="w-full px-3 rounded-lg border border-[#E2E8F0] text-sm font-semibold outline-none bg-white text-[#0F172A] cursor-pointer"
            >
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#64748B] mt-1 mb-0">{rolSeleccionado.desc}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0]">
            <div>
              <label className="block text-xs font-semibold mb-1">Contraseña inicial</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => marcar('password')}
                  placeholder="Ej: RedCell2026!"
                  style={{
                    ...controlStyle,
                    paddingRight: '2.25rem',
                    borderColor:
                      touched.password && password.length > 0 && !passwordEval.esValida
                        ? '#DC2626'
                        : passwordEval.esValida
                          ? '#16A34A'
                          : '#E2E8F0',
                  }}
                  className="w-full px-3 rounded-lg border text-sm outline-none bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label="Mostrar u ocultar contraseña"
                  className="text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 cursor-pointer"
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                maxLength={64}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => marcar('confirm')}
                placeholder="Repite la contraseña"
                style={{
                  ...controlStyle,
                  borderColor: errorConfirm
                    ? '#DC2626'
                    : confirmValido
                      ? '#16A34A'
                      : '#E2E8F0',
                }}
                className="w-full px-3 rounded-lg border text-sm outline-none bg-white"
              />
              {errorConfirm && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorConfirm}</p>
              )}
            </div>
          </div>

          <PasswordRequisitos password={password} confirmPassword={confirmPassword} />

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold border-0 cursor-pointer disabled:opacity-60"
            >
              <UserPlus size={15} />
              {submitting ? 'Registrando usuario...' : 'Registrar usuario'}
            </button>
          </div>
        </form>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 h-fit">
          <h3 className="text-base font-bold m-0 font-headline">Información de roles</h3>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="font-bold text-[#0F172A]">ADMIN</div>
              <p className="text-[#64748B] m-0">
                Puede ver usuarios, activar/desactivar cuentas, registrar miembros y gestionar tarifas.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="font-bold text-[#0F172A]">OPERADOR</div>
              <p className="text-[#64748B] m-0">
                Puede subir PDFs SOAT, gestionar pólizas, enviar recordatorios y ver tarifas.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs">
            <div className="font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
              <KeyRound size={13} className="text-[#D97706]" />
              Control de acceso
            </div>
            <p className="text-[#64748B] m-0">
              Un usuario desactivado no puede iniciar sesión hasta que un administrador lo vuelva a activar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}