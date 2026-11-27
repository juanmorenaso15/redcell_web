import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Coins, Eye, EyeOff, KeyRound, Mail, Save, Shield, User } from 'lucide-react';
import { evaluarPassword, PasswordRequisitos } from '../auth/PasswordRequisitos';
import { api } from '../../services/api';
import type { ActualizarPerfilDTO, PerfilUsuario } from '../../types/soat';
import { alertasSwal } from '../../utils/alerts';
import { formatCOP } from '../../utils/format';

interface ConfiguracionSectionProps {
  perfil: PerfilUsuario | null;
  loadingPerfil: boolean;
  tarifaActivaValor?: number;
  onSavePerfil: (dto: ActualizarPerfilDTO) => Promise<void>;
  onIrATarifas: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

const inputBaseStyle = {
  height: '2.5rem',
  lineHeight: '1.25rem',
} as const;

export function ConfiguracionSection({
  perfil,
  loadingPerfil,
  tarifaActivaValor,
  onSavePerfil,
  onIrATarifas,
}: ConfiguracionSectionProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [touchedPerfil, setTouchedPerfil] = useState<Record<string, boolean>>({});

  // Estado para cambiar contraseña vía OTP
  const [correoOtp, setCorreoOtp] = useState('');
  const [otpEnviado, setOtpEnviado] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [enviandoOtp, setEnviandoOtp] = useState(false);
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [touchedPass, setTouchedPass] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (perfil) {
      setUsername(perfil.username ?? '');
      setEmail(perfil.email ?? '');
      setCorreoOtp((prev) => prev || perfil.email || '');
    }
  }, [perfil]);

  const usernameValido = USERNAME_REGEX.test(username.trim());
  const emailValido = EMAIL_REGEX.test(email.trim());

  const errorUsername =
    touchedPerfil.username && !usernameValido
      ? 'Entre 3 y 30 caracteres (letras, números, punto, guion o guion bajo).'
      : null;

  const errorEmail =
    touchedPerfil.email && !emailValido ? 'Ingresa un correo electrónico válido.' : null;

  const passwordEval = useMemo(() => evaluarPassword(newPassword), [newPassword]);
  const otpValido = /^\d{6}$/.test(otpToken.trim());
  const confirmValido = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouchedPerfil({ username: true, email: true });

    if (!usernameValido || !emailValido) {
      await alertasSwal.advertencia(
        'Datos de perfil incompletos o inválidos',
        'Verifica el nombre de usuario y el correo electrónico antes de guardar.'
      );
      return;
    }

    setSaving(true);
    try {
      await onSavePerfil({
        username: username.trim(),
        email: email.trim().toLowerCase(),
      });
      setCorreoOtp(email.trim().toLowerCase());
      await alertasSwal.exito('Perfil actualizado', 'Los datos de tu cuenta se guardaron correctamente.');
    } catch (err: unknown) {
      await alertasSwal.error(
        'Error al actualizar perfil',
        err instanceof Error ? err.message : 'No se pudo actualizar el perfil'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSolicitarOtpCambio = async () => {
    const destino = (correoOtp || perfil?.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(destino)) {
      await alertasSwal.advertencia(
        'Correo no válido',
        'Ingresa un correo electrónico registrado para enviar el código OTP.'
      );
      return;
    }

    setEnviandoOtp(true);
    try {
      const res = await api.solicitarRecuperacion(destino);
      setOtpEnviado(true);
      await alertasSwal.exito(
        'Código OTP enviado',
        res.message || `Se envió un código de 6 dígitos a ${destino}.`
      );
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo enviar el OTP',
        err instanceof Error ? err.message : 'No se pudo enviar el código OTP'
      );
    } finally {
      setEnviandoOtp(false);
    }
  };

  const handleCambiarPassword = async (e: FormEvent) => {
    e.preventDefault();
    setTouchedPass({ otp: true, newPassword: true, confirm: true });

    if (!otpValido) {
      await alertasSwal.advertencia('Código OTP inválido', 'Ingresa el código de 6 dígitos.');
      return;
    }
    if (!passwordEval.esValida) {
      await alertasSwal.advertencia(
        'Contraseña débil o incompleta',
        'Asegúrate de cumplir todos los requisitos en tiempo real.'
      );
      return;
    }
    if (!confirmValido) {
      await alertasSwal.advertencia(
        'Las contraseñas no coinciden',
        'Verifica que la nueva contraseña y su confirmación sean iguales.'
      );
      return;
    }

    setCambiandoPass(true);
    try {
      const res = await api.restablecerContrasena(otpToken.trim(), newPassword);
      setOtpToken('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpEnviado(false);
      setTouchedPass({});
      await alertasSwal.exito(
        'Contraseña actualizada',
        res.message || 'Tu contraseña se cambió exitosamente.'
      );
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo cambiar la contraseña',
        err instanceof Error ? err.message : 'Verifica el código OTP o intenta nuevamente.'
      );
    } finally {
      setCambiandoPass(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#0F172A]">
            <Shield size={15} className="text-[#DC2626]" />
            Configuración de cuenta y sistema
          </div>
          <h2 className="text-xl font-bold mt-1 mb-0 font-headline">
            {perfil?.username || 'Perfil de usuario'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1 mb-0">
            Administra tu nombre de usuario, correo de acceso, contraseña y tarifas de RedCell SOAT.
          </p>
        </div>

        <button
          type="button"
          onClick={onIrATarifas}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
        >
          <Coins size={14} className="text-[#16A34A]" />
          Uso de plataforma activo:{' '}
          <strong>{tarifaActivaValor != null ? formatCOP(tarifaActivaValor) : '—'}</strong>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
          >
            <h3 className="text-base font-bold m-0 font-headline">Datos del perfil</h3>

            {loadingPerfil ? (
              <p className="text-sm text-[#64748B] m-0">Cargando información del perfil...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={13} />
                        Nombre de usuario
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onBlur={() => setTouchedPerfil((p) => ({ ...p, username: true }))}
                      placeholder="Moreno07"
                      style={inputBaseStyle}
                      className="w-full px-3 rounded-lg border text-sm font-semibold outline-none"
                      aria-invalid={Boolean(errorUsername)}
                    />
                    {errorUsername && (
                      <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">
                        {errorUsername}
                      </p>
                    )}
                  </div>

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
                      onBlur={() => setTouchedPerfil((p) => ({ ...p, email: true }))}
                      placeholder="usuario@redcell.com"
                      style={inputBaseStyle}
                      className="w-full px-3 rounded-lg border text-sm outline-none"
                      aria-invalid={Boolean(errorEmail)}
                    />
                    {errorEmail && (
                      <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">
                        {errorEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#64748B]">Rol asignado en el sistema</span>
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-[#F1F5F9] text-[#0F172A]">
                    {perfil?.rol || 'ADMIN'}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold border-0 cursor-pointer disabled:opacity-60"
                  >
                    <Save size={14} />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </>
            )}
          </form>

          <form
            onSubmit={handleCambiarPassword}
            noValidate
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-[#D97706]" />
              <h3 className="text-base font-bold m-0 font-headline">Cambiar contraseña</h3>
            </div>

            <p className="text-xs text-[#64748B] m-0">
              Solicita un código OTP de 6 dígitos a tu correo registrado y define una nueva contraseña segura.
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1" style={{ minWidth: '220px' }}>
                <label className="block text-xs font-semibold mb-1">Correo para código OTP</label>
                <input
                  type="email"
                  maxLength={120}
                  value={correoOtp}
                  onChange={(e) => setCorreoOtp(e.target.value)}
                  placeholder="usuario@redcell.com"
                  style={inputBaseStyle}
                  className="w-full px-3 rounded-lg border border-[#E2E8F0] text-sm outline-none bg-white"
                />
              </div>

              <button
                type="button"
                disabled={enviandoOtp}
                onClick={handleSolicitarOtpCambio}
                style={inputBaseStyle}
                className="inline-flex items-center gap-1.5 px-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer disabled:opacity-60 shrink-0"
              >
                <Mail size={14} />
                {enviandoOtp ? 'Enviando...' : otpEnviado ? 'Reenviar código OTP' : 'Enviar código OTP'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-semibold mb-1">Código OTP (6 dígitos)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => setTouchedPass((p) => ({ ...p, otp: true }))}
                  placeholder="123456"
                  style={{
                    ...inputBaseStyle,
                    borderColor: touchedPass.otp && otpToken.length > 0 && !otpValido ? '#DC2626' : '#E2E8F0',
                  }}
                  className="w-full px-3 rounded-lg border text-sm font-semibold outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    maxLength={64}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => setTouchedPass((p) => ({ ...p, newPassword: true }))}
                    placeholder="Ej: RedCell2026!"
                    style={{
                      ...inputBaseStyle,
                      paddingRight: '2.25rem',
                      borderColor:
                        touchedPass.newPassword && newPassword.length > 0 && !passwordEval.esValida
                          ? '#DC2626'
                          : passwordEval.esValida
                            ? '#16A34A'
                            : '#E2E8F0',
                    }}
                    className="w-full px-3 rounded-lg border text-sm outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((v) => !v)}
                    aria-label="Mostrar u ocultar contraseña"
                    className="text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 cursor-pointer"
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Confirmar contraseña</label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  maxLength={64}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouchedPass((p) => ({ ...p, confirm: true }))}
                  placeholder="Repite la contraseña"
                  style={{
                    ...inputBaseStyle,
                    borderColor:
                      touchedPass.confirm && confirmPassword.length > 0 && !confirmValido
                        ? '#DC2626'
                        : confirmValido
                          ? '#16A34A'
                          : '#E2E8F0',
                  }}
                  className="w-full px-3 rounded-lg border text-sm outline-none bg-white"
                />
              </div>
            </div>

            <PasswordRequisitos password={newPassword} confirmPassword={confirmPassword} />

            <div className="pt-1">
              <button
                type="submit"
                disabled={cambiandoPass || !otpValido || !passwordEval.esValida || !confirmValido}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold border-0 cursor-pointer disabled:opacity-60"
              >
                <KeyRound size={14} />
                {cambiandoPass ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold m-0 font-headline">Seguridad y sesión</h3>
          <p className="text-xs text-[#64748B] m-0">
            Si modificas tu nombre de usuario, te recomendamos volver a iniciar sesión para refrescar el token JWT con el nuevo identificador.
          </p>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs">
            <div className="font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
              <KeyRound size={13} className="text-[#D97706]" />
              Requisitos de contraseña
            </div>
            <p className="text-[#64748B] m-0">
              Mínimo 8 caracteres (máx. 64), incluyendo mayúscula, minúscula, número y un carácter especial (@$!%*?&), sin espacios.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}