import { useState, type FormEvent } from 'react';
import { CheckCircle2, Coins, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ConfiguracionTarifa, Poliza } from '../../types/soat';
import { alertasSwal } from '../../utils/alerts';
import { formatCOP } from '../../utils/format';

interface UsoPlataformaSectionProps {
  tarifas: ConfiguracionTarifa[];
  polizas: Poliza[];
  loading: boolean;
  onCreateTarifa: (tarifa: Omit<ConfiguracionTarifa, 'id'>) => Promise<void>;
  onUpdateTarifa: (id: number, tarifa: Partial<ConfiguracionTarifa>) => Promise<void>;
  onDeleteTarifa: (id: number) => Promise<void>;
  onApplyTarifaToPolizas: (valor: number, soloSinTarifa: boolean) => Promise<void>;
}

const MAX_TARIFA_COP = 500000;

function acotarTarifa(raw: string): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Math.min(MAX_TARIFA_COP, Math.max(0, Math.round(num)));
}

export function UsoPlataformaSection({
  tarifas,
  polizas,
  loading,
  onCreateTarifa,
  onUpdateTarifa,
  onDeleteTarifa,
  onApplyTarifaToPolizas,
}: UsoPlataformaSectionProps) {
  const anioActual = new Date().getFullYear();

  const [nombre, setNombre] = useState(`Uso Plataforma ${anioActual}`);
  const [valor, setValor] = useState('15000');
  const [activarAlCrear, setActivarAlCrear] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editValor, setEditValor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);

  const tarifaActiva = tarifas.find((t) => Boolean(t.activo));
  const valorActivo = acotarTarifa(String(tarifaActiva?.valor ?? 15000));
  const tarifaAnioActual = tarifas.find((t) => t.nombre?.includes(String(anioActual)));

  const handleCrear = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      await alertasSwal.advertencia('Nombre requerido', 'Escribe un nombre para la tarifa.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateTarifa({
        nombre: nombre.trim().slice(0, 80),
        valor: acotarTarifa(valor),
        activo: activarAlCrear,
      });
      setNombre(`Uso Plataforma ${new Date().getFullYear()}`);
      setValor('15000');
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (t: ConfiguracionTarifa) => {
    if (!t.id) return;
    setEditingId(t.id);
    setEditNombre(t.nombre.slice(0, 80));
    setEditValor(String(acotarTarifa(String(t.valor))));
  };

  const guardarEdicion = async (id: number) => {
    setSubmitting(true);
    try {
      await onUpdateTarifa(id, {
        nombre: (editNombre.trim() || `Uso Plataforma ${new Date().getFullYear()}`).slice(0, 80),
        valor: acotarTarifa(editValor),
      });
      setEditingId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAplicar = async (soloSinTarifa: boolean) => {
    const ok = await alertasSwal.confirmar(
      soloSinTarifa ? 'Aplicar a pólizas en $0' : 'Aplicar a todas las pólizas',
      soloSinTarifa
        ? `Se asignará ${formatCOP(valorActivo)} únicamente a las pólizas con uso de plataforma en $0.`
        : `Se actualizará el uso de plataforma a ${formatCOP(valorActivo)} en todas las ${polizas.length} pólizas registradas.`,
      'Aplicar tarifa'
    );
    if (!ok) return;

    setApplying(true);
    try {
      await onApplyTarifaToPolizas(valorActivo, soloSinTarifa);
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#16A34A]">
            <Coins size={15} />
            Uso de plataforma activo · Año {anioActual}
          </div>
          <h2 className="text-xl font-bold mt-1 mb-0 font-headline">
            {formatCOP(valorActivo)}{' '}
            <span className="text-sm font-medium text-[#64748B]">
              ({tarifaActiva?.nombre || `Uso Plataforma ${anioActual}`})
            </span>
          </h2>
          <p className="text-xs text-[#64748B] mt-1 mb-0">
            Año detectado por el sistema: <strong>{anioActual}</strong>
            {tarifaAnioActual
              ? ` · Tarifa registrada para ${anioActual}: ${tarifaAnioActual.nombre} (${formatCOP(tarifaAnioActual.valor)})`
              : ` · Sin tarifa específica creada para ${anioActual}`}
            {' · '}
            {polizas.length} pólizas registradas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={applying || polizas.length === 0}
            onClick={() => handleAplicar(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} />
            {applying ? 'Aplicando...' : 'Aplicar a pólizas en $0'}
          </button>

          <button
            type="button"
            disabled={applying || polizas.length === 0}
            onClick={() => handleAplicar(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold border-0 cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 size={14} />
            {applying ? 'Aplicando...' : 'Aplicar a todas las pólizas'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <form
          onSubmit={handleCrear}
          className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
        >
          <h3 className="text-base font-bold m-0 font-headline">
            Nueva tarifa de uso de plataforma ({anioActual})
          </h3>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Nombre de la tarifa <span className="text-[11px] font-normal text-[#64748B]">(máx. 80)</span>
            </label>
            <input
              type="text"
              maxLength={80}
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={`Uso Plataforma ${anioActual}`}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Valor uso de plataforma (0 a {formatCOP(MAX_TARIFA_COP)})
            </label>
            <input
              type="number"
              min={0}
              max={MAX_TARIFA_COP}
              step={100}
              required
              value={valor}
              onChange={(e) => setValor(String(acotarTarifa(e.target.value)))}
              className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm font-semibold"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F172A] cursor-pointer">
            <input
              type="checkbox"
              checked={activarAlCrear}
              onChange={(e) => setActivarAlCrear(e.target.checked)}
            />
            Marcar como tarifa activa al guardar
          </label>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold border-0 cursor-pointer disabled:opacity-60"
            >
              <Plus size={15} />
              {submitting ? 'Guardando...' : 'Crear tarifa'}
            </button>
          </div>
        </form>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
          <h3 className="text-base font-bold m-0 mb-4 font-headline">
            Tarifas configuradas ({tarifas.length})
          </h3>

          {loading ? (
            <p className="text-sm text-[#64748B] m-0">Cargando tarifas...</p>
          ) : tarifas.length === 0 ? (
            <p className="text-sm text-[#64748B] m-0">
              Aún no hay tarifas registradas en el backend.
            </p>
          ) : (
            <div className="space-y-3">
              {tarifas.map((t) => {
                const isEditing = editingId === t.id;
                const esAnioActual = t.nombre?.includes(String(anioActual));
                return (
                  <div
                    key={t.id ?? t.nombre}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3"
                  >
                    {isEditing && t.id ? (
                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          maxLength={80}
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs bg-white flex-1"
                        />
                        <input
                          type="number"
                          min={0}
                          max={MAX_TARIFA_COP}
                          step={100}
                          value={editValor}
                          onChange={(e) => setEditValor(String(acotarTarifa(e.target.value)))}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs bg-white w-28 font-semibold"
                        />
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => guardarEdicion(t.id!)}
                          className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white text-xs font-semibold border-0 cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-[#0F172A]">{t.nombre}</span>
                            {esAnioActual && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#0F172A]">
                                Año {anioActual}
                              </span>
                            )}
                            {t.activo && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-[#0F172A]">
                                Activa
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-[#16A34A] mt-0.5">
                            {formatCOP(t.valor)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!t.activo && t.id && (
                            <button
                              type="button"
                              onClick={() => onUpdateTarifa(t.id!, { activo: true })}
                              className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
                            >
                              Activar
                            </button>
                          )}
                          {t.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => iniciarEdicion(t)}
                                title="Editar tarifa"
                                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#0F172A] cursor-pointer"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTarifa(t.id!)}
                                title="Eliminar tarifa"
                                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-red-50 text-[#DC2626] cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}