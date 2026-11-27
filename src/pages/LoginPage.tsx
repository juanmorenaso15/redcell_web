import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { evaluarPassword, PasswordRequisitos } from '../components/auth/PasswordRequisitos';
import { api } from '../services/api';
import { alertasSwal } from '../utils/alerts';

interface LoginPageProps {
  onSuccess: (token: string) => void;
}

type ModoAuth = 'login' | 'solicitar-otp' | 'restablecer';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [modo, setModo] = useState<ModoAuth>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const marcarTocado = (campo: string) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
  };

  const cambiarModo = (nuevoModo: ModoAuth) => {
    setModo(nuevoModo);
    setTouched({});
  };

  const emailValido = EMAIL_REGEX.test(email.trim());
  const passwordEval = useMemo(() => evaluarPassword(newPassword), [newPassword]);
  const otpValido = /^\d{6}$/.test(otpToken.trim());
  const confirmValido = newPassword.length > 0 && newPassword === confirmPassword;

  const errorEmail =
    touched.email && !email.trim()
      ? 'El correo electrónico es obligatorio.'
      : touched.email && !emailValido
        ? 'Ingresa un correo electrónico válido (ej. usuario@redcell.com).'
        : null;

  const errorLoginPass =
    touched.password && !password
      ? 'Ingresa tu contraseña.'
      : touched.password && password.length < 4
        ? 'La contraseña es demasiado corta.'
        : null;

  const errorOtp =
    touched.otp && !otpValido
      ? 'El código OTP debe tener exactamente 6 dígitos numéricos.'
      : null;

  const errorConfirm =
    touched.confirm && !confirmValido
      ? 'La confirmación debe ser idéntica a la nueva contraseña.'
      : null;

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!emailValido || !password) {
      await alertasSwal.advertencia(
        'Revisa tus datos',
        'Completa un correo electrónico válido y tu contraseña para ingresar.'
      );
      return;
    }

    setLoading(true);
    try {
      const jwt = await api.login(email.trim().toLowerCase(), password);
      await alertasSwal.toast('success', 'Bienvenido a RedCell SOAT');
      onSuccess(jwt);
    } catch (err: unknown) {
      await alertasSwal.error(
        'Error al iniciar sesión',
        err instanceof Error ? err.message : 'Credenciales inválidas'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarOtp = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true });

    if (!emailValido) {
      await alertasSwal.advertencia(
        'Correo no válido',
        'Ingresa el correo electrónico registrado en tu cuenta para recibir el código OTP.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.solicitarRecuperacion(email.trim().toLowerCase());
      await alertasSwal.exito(
        'Código OTP enviado',
        res.message || 'Revisa tu bandeja de entrada o spam (válido por 15 minutos).'
      );
      setTouched({});
      setModo('restablecer');
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo enviar el OTP',
        err instanceof Error ? err.message : 'Verifica que el correo esté registrado.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestablecerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ otp: true, newPassword: true, confirm: true });

    if (!otpValido) {
      await alertasSwal.advertencia('Código OTP inválido', 'Ingresa el código de 6 dígitos.');
      return;
    }
    if (!passwordEval.esValida) {
      await alertasSwal.advertencia(
        'Contraseña no cumple requisitos',
        'Completa todos los indicadores de seguridad en tiempo real.'
      );
      return;
    }
    if (!confirmValido) {
      await alertasSwal.advertencia(
        'Las contraseñas no coinciden',
        'Verifica que ambas contraseñas sean iguales.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.restablecerContrasena(otpToken.trim(), newPassword);
      setPassword('');
      setOtpToken('');
      setNewPassword('');
      setConfirmPassword('');
      setTouched({});
      setModo('login');
      await alertasSwal.exito(
        'Contraseña restablecida',
        res.message || 'Ya puedes iniciar sesión con tu nueva contraseña.'
      );
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo restablecer',
        err instanceof Error ? err.message : 'El código OTP puede haber expirado o ser incorrecto.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo-redcell.png"
            alt="RedCell"
            className="h-11 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] m-0 font-headline">RedCell SOAT</h1>
            <p className="text-xs text-[#64748B] m-0">
              {modo === 'login' && 'Ingreso al panel operativo'}
              {modo === 'solicitar-otp' && 'Recuperar contraseña mediante código OTP'}
              {modo === 'restablecer' && 'Ingresar código OTP y nueva contraseña'}
            </p>
          </div>
        </div>

        {modo === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => marcarTocado('email')}
                placeholder="usuario@redcell.com"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: errorEmail ? '#DC2626' : emailValido ? '#16A34A' : '#E2E8F0',
                }}
              />
              {errorEmail && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorEmail}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-semibold text-[#0F172A]">Contraseña</label>
                <button
                  type="button"
                  onClick={() => cambiarModo('solicitar-otp')}
                  className="text-xs font-semibold text-[#DC2626] hover:text-[#B91C1C] bg-transparent border-0 p-0 cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => marcarTocado('password')}
                  placeholder="••••••••"
                  style={{
                    paddingRight: '2.5rem',
                    borderColor: errorLoginPass ? '#DC2626' : '#E2E8F0',
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:border-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label="Mostrar u ocultar contraseña"
                  className="text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 cursor-pointer"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errorLoginPass && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">
                  {errorLoginPass}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm cursor-pointer border-0 disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        )}

        {modo === 'solicitar-otp' && (
          <form onSubmit={handleSolicitarOtp} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Correo electrónico registrado
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => marcarTocado('email')}
                placeholder="usuario@redcell.com"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: errorEmail ? '#DC2626' : emailValido ? '#16A34A' : '#E2E8F0',
                }}
              />
              {errorEmail ? (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorEmail}</p>
              ) : (
                <p className="text-[11px] text-[#64748B] mt-1.5 mb-0">
                  Te enviaremos un código OTP de 6 dígitos válido por 15 minutos.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm cursor-pointer border-0 disabled:opacity-60"
            >
              <Mail size={15} />
              {loading ? 'Enviando código...' : 'Enviar código OTP'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
              <button
                type="button"
                onClick={() => cambiarModo('login')}
                className="inline-flex items-center gap-1 font-semibold text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 p-0 cursor-pointer"
              >
                <ArrowLeft size={13} />
                Volver al inicio de sesión
              </button>

              <button
                type="button"
                onClick={() => cambiarModo('restablecer')}
                className="font-semibold text-[#0F172A] hover:text-[#DC2626] bg-transparent border-0 p-0 cursor-pointer"
              >
                Ya tengo código
              </button>
            </div>
          </form>
        )}

        {modo === 'restablecer' && (
          <form onSubmit={handleRestablecerSubmit} noValidate className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  Código OTP (6 dígitos)
                </label>
                <span className="text-[11px] text-[#64748B]">{otpToken.length}/6</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={() => marcarTocado('otp')}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-semibold outline-none"
                style={{
                  borderColor: errorOtp ? '#DC2626' : otpValido ? '#16A34A' : '#E2E8F0',
                }}
              />
              {errorOtp && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorOtp}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  maxLength={64}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => marcarTocado('newPassword')}
                  placeholder="Crea una contraseña segura"
                  style={{
                    paddingRight: '2.5rem',
                    borderColor:
                      touched.newPassword && !passwordEval.esValida
                        ? '#DC2626'
                        : passwordEval.esValida
                          ? '#16A34A'
                          : '#E2E8F0',
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass((v) => !v)}
                  aria-label="Mostrar u ocultar nueva contraseña"
                  className="text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 cursor-pointer"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Confirmar nueva contraseña
              </label>
              <input
                type={showNewPass ? 'text' : 'password'}
                maxLength={64}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => marcarTocado('confirm')}
                placeholder="Repite la nueva contraseña"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: errorConfirm
                    ? '#DC2626'
                    : confirmValido
                      ? '#16A34A'
                      : '#E2E8F0',
                }}
              />
              {errorConfirm && (
                <p className="text-[11px] font-medium text-[#DC2626] mt-1 mb-0">{errorConfirm}</p>
              )}
            </div>

            <PasswordRequisitos password={newPassword} confirmPassword={confirmPassword} />

            <button
              type="submit"
              disabled={loading || !otpValido || !passwordEval.esValida || !confirmValido}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm cursor-pointer border-0 disabled:opacity-60"
            >
              <KeyRound size={15} />
              {loading ? 'Actualizando contraseña...' : 'Restablecer contraseña'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
              <button
                type="button"
                onClick={() => cambiarModo('solicitar-otp')}
                className="font-semibold text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 p-0 cursor-pointer"
              >
                Reenviar código OTP
              </button>

              <button
                type="button"
                onClick={() => cambiarModo('login')}
                className="inline-flex items-center gap-1 font-semibold text-[#0F172A] hover:text-[#DC2626] bg-transparent border-0 p-0 cursor-pointer"
              >
                <ArrowLeft size={13} />
                Iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}