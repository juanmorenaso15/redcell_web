import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Poliza, PolizaUpdateDTO } from '../../types/soat';
import { alertasSwal } from '../../utils/alerts';
import { formatCOP } from '../../utils/format';

interface EditarPolizaModalProps {
  poliza: Poliza | null;
  onClose: () => void;
  onSave: (id: number, dto: PolizaUpdateDTO) => Promise<void>;
}

interface FormState {
  placa: string;
  tipoVehiculo: string;
  marcaLinea: string;
  cilindraje: string;
  aseguradora: string;
  edadVehiculo: string;
  capacidadToneladas: string;
  desde: string;
  hasta: string;
  propietario: string;
  tipoDocumento: string;
  documento: string;
  usoPlataforma: string;
  telefono: string;
  email: string;
}

const LIMITES = {
  placaMax: 8,
  aseguradoraMax: 80,
  tipoVehiculoMax: 80,
  marcaLineaMax: 100,
  propietarioMax: 120,
  tipoDocMax: 10,
  documentoMax: 99999999999,
  cilindrajeMax: 15000,
  edadMax: 100,
  capacidadMax: 100,
  usoPlataformaMax: 500000,
  telefonoMax: 15,
  emailMax: 120,
} as const;

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const initialForm: FormState = {
  placa: '',
  tipoVehiculo: '',
  marcaLinea: '',
  cilindraje: '0',
  aseguradora: '',
  edadVehiculo: '0',
  capacidadToneladas: '0',
  desde: '',
  hasta: '',
  propietario: '',
  tipoDocumento: 'CC',
  documento: '0',
  usoPlataforma: '15000',
  telefono: '',
  email: '',
};

function clampNumero(raw: string, min: number, max: number, allowDecimal = false): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return min;
  const clamped = Math.min(max, Math.max(min, num));
  return allowDecimal ? Math.round(clamped * 10) / 10 : Math.round(clamped);
}

export function EditarPolizaModal({ poliza, onClose, onSave }: EditarPolizaModalProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (poliza) {
      setForm({
        placa: (poliza.placa ?? '').slice(0, LIMITES.placaMax),
        tipoVehiculo: (poliza.tipoVehiculo ?? '').slice(0, LIMITES.tipoVehiculoMax),
        marcaLinea: (poliza.marcaLinea ?? '').slice(0, LIMITES.marcaLineaMax),
        cilindraje: String(clampNumero(String(poliza.cilindraje ?? 0), 0, LIMITES.cilindrajeMax)),
        aseguradora: (poliza.aseguradora ?? '').slice(0, LIMITES.aseguradoraMax),
        edadVehiculo: String(clampNumero(String(poliza.edadVehiculo ?? 0), 0, LIMITES.edadMax)),
        capacidadToneladas: String(
          clampNumero(String(poliza.capacidadToneladas ?? 0), 0, LIMITES.capacidadMax, true)
        ),
        desde: poliza.desde ?? '',
        hasta: poliza.hasta ?? '',
        propietario: (poliza.propietario ?? '').slice(0, LIMITES.propietarioMax),
        tipoDocumento: (poliza.tipoDocumento ?? 'CC').slice(0, LIMITES.tipoDocMax),
        documento: String(clampNumero(String(poliza.documento ?? 0), 0, LIMITES.documentoMax)),
        usoPlataforma: String(
          clampNumero(String(poliza.usoPlataforma ?? 15000), 0, LIMITES.usoPlataformaMax)
        ),
        telefono: (poliza.telefono ?? '').replace(/\D/g, '').slice(0, LIMITES.telefonoMax),
        email: (poliza.email ?? '').slice(0, LIMITES.emailMax),
      });
    }
  }, [poliza]);

  const usoNormalizado = useMemo(
    () => clampNumero(form.usoPlataforma, 0, LIMITES.usoPlataformaMax),
    [form.usoPlataforma]
  );

  if (!poliza) return null;

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumeroAcotado = (
    key: 'cilindraje' | 'edadVehiculo' | 'capacidadToneladas' | 'documento' | 'usoPlataforma',
    raw: string,
    max: number,
    allowDecimal = false
  ) => {
    if (raw === '') {
      setField(key, '');
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    if (parsed > max) {
      setField(key, String(max));
      return;
    }
    if (parsed < 0) {
      setField(key, '0');
      return;
    }
    setField(key, allowDecimal ? raw.slice(0, 6) : String(Math.trunc(parsed)));
  };

  const validarFormulario = (): string | null => {
    const placaClean = form.placa.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,8}$/.test(placaClean)) {
      return 'La placa debe tener entre 3 y 8 caracteres (letras, números o guion).';
    }

    if (form.desde.trim() && !FECHA_REGEX.test(form.desde.trim())) {
      return 'La fecha "Vigencia desde" debe tener formato YYYY-MM-DD.';
    }
    if (form.hasta.trim() && !FECHA_REGEX.test(form.hasta.trim())) {
      return 'La fecha "Vigencia hasta" debe tener formato YYYY-MM-DD.';
    }
    if (form.desde.trim() && form.hasta.trim() && form.hasta.trim() < form.desde.trim()) {
      return 'La fecha de vencimiento ("Vigencia hasta") no puede ser anterior a "Vigencia desde".';
    }

    const telClean = form.telefono.replace(/\D/g, '');
    if (telClean && (telClean.length < 7 || telClean.length > LIMITES.telefonoMax)) {
      return `El teléfono debe tener entre 7 y ${LIMITES.telefonoMax} dígitos.`;
    }

    const emailClean = form.email.trim();
    if (emailClean && !EMAIL_REGEX.test(emailClean)) {
      return 'Ingresa un correo electrónico válido o deja el campo vacío.';
    }

    const usoNum = Number(form.usoPlataforma || 0);
    if (!Number.isFinite(usoNum) || usoNum < 0 || usoNum > LIMITES.usoPlataformaMax) {
      return `El uso de plataforma debe estar entre $0 y ${formatCOP(LIMITES.usoPlataformaMax)}.`;
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      await alertasSwal.advertencia('Revisa los límites del formulario', errorValidacion);
      return;
    }

    setSaving(true);
    try {
      const dto: PolizaUpdateDTO = {
        placa: form.placa.trim().toUpperCase().slice(0, LIMITES.placaMax),
        tipoVehiculo: form.tipoVehiculo.trim().slice(0, LIMITES.tipoVehiculoMax),
        marcaLinea: form.marcaLinea.trim().slice(0, LIMITES.marcaLineaMax),
        cilindraje: clampNumero(form.cilindraje, 0, LIMITES.cilindrajeMax),
        aseguradora: form.aseguradora.trim().slice(0, LIMITES.aseguradoraMax),
        edadVehiculo: clampNumero(form.edadVehiculo, 0, LIMITES.edadMax),
        capacidadToneladas: clampNumero(
          form.capacidadToneladas,
          0,
          LIMITES.capacidadMax,
          true
        ),
        desde: form.desde.trim(),
        hasta: form.hasta.trim(),
        propietario: form.propietario.trim().slice(0, LIMITES.propietarioMax),
        tipoDocumento: form.tipoDocumento.trim().toUpperCase().slice(0, LIMITES.tipoDocMax),
        documento: clampNumero(form.documento, 0, LIMITES.documentoMax),
        usoPlataforma: usoNormalizado,
        telefono: form.telefono.replace(/\D/g, '').slice(0, LIMITES.telefonoMax),
        email: form.email.trim().toLowerCase().slice(0, LIMITES.emailMax),
      };
      await onSave(poliza.id, dto);
      onClose();
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo guardar la póliza',
        err instanceof Error ? err.message : 'Error al actualizar la póliza'
      );
    } finally {
      setSaving(false);
    }
  };

  const totalSimulado = Number(poliza.precioSoat || 0) + usoNormalizado;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] w-full max-w-2xl p-6 shadow-sm mx-auto"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="relative pb-4 border-b border-[#E2E8F0] text-center mb-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] bg-transparent border-0 cursor-pointer"
            style={{ position: 'absolute', right: 0, top: 0 }}
          >
            <X size={18} />
          </button>
          <h2 className="text-lg font-bold m-0 font-headline">
            Editar SOAT completo · {poliza.placa}
          </h2>
          <p className="text-xs text-[#64748B] mt-1 mb-0">
            Todos los campos cuentan con topes máximos para evitar errores o desbordamientos.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[11px] text-[#64748B]">Valor SOAT</div>
              <div className="text-sm font-bold">{formatCOP(poliza.precioSoat)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748B]">Uso de plataforma</div>
              <div className="text-sm font-bold text-[#16A34A]">{formatCOP(usoNormalizado)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#DC2626] font-semibold">Total estimado</div>
              <div className="text-sm font-bold text-[#DC2626]">{formatCOP(totalSimulado)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Placa <span className="text-[11px] font-normal text-[#64748B]">(máx. 8)</span>
              </label>
              <input
                type="text"
                maxLength={LIMITES.placaMax}
                value={form.placa}
                onChange={(e) =>
                  setField('placa', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm uppercase font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Aseguradora <span className="text-[11px] font-normal text-[#64748B]">(máx. 80)</span>
              </label>
              <input
                type="text"
                maxLength={LIMITES.aseguradoraMax}
                value={form.aseguradora}
                onChange={(e) => setField('aseguradora', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Tipo / Clase <span className="text-[11px] font-normal text-[#64748B]">(máx. 80)</span>
              </label>
              <input
                type="text"
                maxLength={LIMITES.tipoVehiculoMax}
                value={form.tipoVehiculo}
                onChange={(e) => setField('tipoVehiculo', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Marca y línea <span className="text-[11px] font-normal text-[#64748B]">(máx. 100)</span>
              </label>
              <input
                type="text"
                maxLength={LIMITES.marcaLineaMax}
                value={form.marcaLinea}
                onChange={(e) => setField('marcaLinea', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Cilindraje (cc){' '}
                <span className="text-[11px] font-normal text-[#64748B]">
                  (0–{LIMITES.cilindrajeMax})
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={LIMITES.cilindrajeMax}
                value={form.cilindraje}
                onChange={(e) =>
                  handleNumeroAcotado('cilindraje', e.target.value, LIMITES.cilindrajeMax)
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Edad (0–{LIMITES.edadMax})
                </label>
                <input
                  type="number"
                  min={0}
                  max={LIMITES.edadMax}
                  value={form.edadVehiculo}
                  onChange={(e) =>
                    handleNumeroAcotado('edadVehiculo', e.target.value, LIMITES.edadMax)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Cap. t (0–{LIMITES.capacidadMax})
                </label>
                <input
                  type="number"
                  min={0}
                  max={LIMITES.capacidadMax}
                  step="0.1"
                  value={form.capacidadToneladas}
                  onChange={(e) =>
                    handleNumeroAcotado(
                      'capacidadToneladas',
                      e.target.value,
                      LIMITES.capacidadMax,
                      true
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Propietario <span className="text-[11px] font-normal text-[#64748B]">(máx. 120)</span>
              </label>
              <input
                type="text"
                maxLength={LIMITES.propietarioMax}
                value={form.propietario}
                onChange={(e) => setField('propietario', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Tipo doc. <span className="text-[11px] font-normal text-[#64748B]">(máx. 10)</span>
                </label>
                <input
                  type="text"
                  maxLength={LIMITES.tipoDocMax}
                  value={form.tipoDocumento}
                  onChange={(e) => setField('tipoDocumento', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Documento</label>
                <input
                  type="number"
                  min={0}
                  max={LIMITES.documentoMax}
                  value={form.documento}
                  onChange={(e) =>
                    handleNumeroAcotado('documento', e.target.value, LIMITES.documentoMax)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Vigencia desde (YYYY-MM-DD)</label>
              <input
                type="text"
                maxLength={10}
                value={form.desde}
                onChange={(e) => setField('desde', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Vigencia hasta (YYYY-MM-DD)</label>
              <input
                type="text"
                maxLength={10}
                value={form.hasta}
                onChange={(e) => setField('hasta', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Teléfono WhatsApp{' '}
                <span className="text-[11px] font-normal text-[#64748B]">
                  (máx. {LIMITES.telefonoMax} dígitos)
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={LIMITES.telefonoMax}
                value={form.telefono}
                onChange={(e) =>
                  setField('telefono', e.target.value.replace(/\D/g, '').slice(0, LIMITES.telefonoMax))
                }
                placeholder="3117034142"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Correo electrónico{' '}
                <span className="text-[11px] font-normal text-[#64748B]">
                  (máx. {LIMITES.emailMax})
                </span>
              </label>
              <input
                type="email"
                maxLength={LIMITES.emailMax}
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0]">
            <label className="block text-xs font-semibold mb-1">
              Uso de plataforma (COP){' '}
              <span className="text-[11px] font-normal text-[#64748B]">
                (0 a {formatCOP(LIMITES.usoPlataformaMax)})
              </span>
            </label>
            <input
              type="number"
              min={0}
              max={LIMITES.usoPlataformaMax}
              step={100}
              value={form.usoPlataforma}
              onChange={(e) =>
                handleNumeroAcotado('usoPlataforma', e.target.value, LIMITES.usoPlataformaMax)
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-semibold"
            />
          </div>

          <div className="flex justify-center gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm bg-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold border-0 cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}