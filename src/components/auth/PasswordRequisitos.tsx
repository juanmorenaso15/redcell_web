import { Check, Lock, X } from 'lucide-react';

interface PasswordRequisitosProps {
  password: string;
  confirmPassword?: string;
}

export function evaluarPassword(password: string) {
  const checks = [
    {
      id: 'len',
      label: '8–64 caracteres',
      ok: password.length >= 8 && password.length <= 64,
    },
    {
      id: 'upper',
      label: 'Mayúscula (A-Z)',
      ok: /[A-Z]/.test(password),
    },
    {
      id: 'lower',
      label: 'Minúscula (a-z)',
      ok: /[a-z]/.test(password),
    },
    {
      id: 'num',
      label: 'Número (0-9)',
      ok: /\d/.test(password),
    },
    {
      id: 'spec',
      label: 'Símbolo (@$!%*?&)',
      ok: /[@$!%*?&]/.test(password),
    },
    {
      id: 'space',
      label: 'Sin espacios',
      ok: password.length > 0 && !/\s/.test(password),
    },
  ];

  const cumplidos = checks.filter((c) => c.ok).length;
  const esValida = checks.every((c) => c.ok);

  return { checks, cumplidos, total: checks.length, esValida };
}

export function PasswordRequisitos({ password, confirmPassword }: PasswordRequisitosProps) {
  const { checks, cumplidos, total } = evaluarPassword(password);
  const porcentaje = Math.round((cumplidos / total) * 100);

  const colorFuerza =
    cumplidos === 0
      ? '#64748B'
      : cumplidos <= 2
        ? '#DC2626'
        : cumplidos <= 4
          ? '#D97706'
          : '#16A34A';

  const etiquetaFuerza =
    cumplidos === 0
      ? 'Sin iniciar'
      : cumplidos <= 2
        ? 'Débil'
        : cumplidos <= 4
          ? 'Media'
          : cumplidos < total
            ? 'Casi lista'
            : 'Segura';

  const mostrarCoincidencia =
    confirmPassword !== undefined && confirmPassword.length > 0;
  const coincide = password === confirmPassword;

  return (
    <div
      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
          <Lock size={13} style={{ color: colorFuerza }} />
          <span>Nivel de contraseña:</span>
          <span style={{ color: colorFuerza }}>{etiquetaFuerza}</span>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] text-[#475569]">
          {cumplidos}/{total}
        </span>
      </div>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: '5px', backgroundColor: '#E2E8F0' }}
      >
        <div
          style={{
            width: `${porcentaje}%`,
            height: '100%',
            backgroundColor: colorFuerza,
            transition: 'width 180ms ease, background-color 180ms ease',
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {checks.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border"
            style={{
              backgroundColor: item.ok ? '#F0FDF4' : '#FFFFFF',
              borderColor: item.ok ? '#BBF7D0' : '#E2E8F0',
              color: item.ok ? '#15803D' : '#64748B',
            }}
          >
            {item.ok ? <Check size={11} /> : <X size={11} style={{ opacity: 0.55 }} />}
            {item.label}
          </span>
        ))}
      </div>

      {mostrarCoincidencia && (
        <div
          className="pt-2 border-t border-[#E2E8F0] flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: coincide ? '#15803D' : '#DC2626' }}
        >
          {coincide ? <Check size={13} /> : <X size={13} />}
          <span>
            {coincide
              ? 'La confirmación coincide con la nueva contraseña'
              : 'La confirmación no coincide con la nueva contraseña'}
          </span>
        </div>
      )}
    </div>
  );
}