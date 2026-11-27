import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { Poliza } from '../../types/soat';
import { formatCOP } from '../../utils/format';

export type EstadoVigenciaFilter = 'TODOS' | 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';

interface PolizasTableProps {
  polizas: Poliza[];
  totalCount: number;
  page: number; // base 0 (Spring Data Page.number)
  pageSize: number; // por defecto 10 (Spring Data Page.size)
  totalPages: number; // Spring Data Page.totalPages
  onPageChange: (newPage: number) => void;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  aseguradoraFilter: string;
  onAseguradoraChange: (value: string) => void;
  aseguradoras: string[];
  tipoVehiculoFilter: string;
  onTipoVehiculoChange: (value: string) => void;
  tiposVehiculo: string[];
  vigenciaFilter: EstadoVigenciaFilter;
  onVigenciaChange: (value: EstadoVigenciaFilter) => void;
  onClearFilters: () => void;
  onView: (poliza: Poliza) => void;
  onEdit: (poliza: Poliza) => void;
  onDelete: (poliza: Poliza) => void;
}

const controlBoxStyle = {
  height: '2.5rem',
  lineHeight: '1.25rem',
} as const;

const selectControlStyle = {
  ...controlBoxStyle,
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  paddingLeft: '0.875rem',
  paddingRight: '2.25rem',
} as const;

function formatFechaLegible(fecha?: string | null): string {
  if (!fecha) return '—';
  const limpia = fecha.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpia);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return limpia;
}

function esPolizaVigente(poliza: Poliza, hoyStr: string): boolean {
  return Boolean(poliza.activo) && (!poliza.hasta || poliza.hasta >= hoyStr);
}

function generarPaginasVisibles(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const paginas: (number | '...')[] = [0];
  const inicio = Math.max(1, currentPage - 1);
  const fin = Math.min(totalPages - 2, currentPage + 1);

  if (inicio > 1) paginas.push('...');
  for (let i = inicio; i <= fin; i++) {
    paginas.push(i);
  }
  if (fin < totalPages - 2) paginas.push('...');
  paginas.push(totalPages - 1);

  return paginas;
}

export function PolizasTable({
  polizas,
  totalCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  loading,
  search,
  onSearchChange,
  aseguradoraFilter,
  onAseguradoraChange,
  aseguradoras,
  tipoVehiculoFilter,
  onTipoVehiculoChange,
  tiposVehiculo,
  vigenciaFilter,
  onVigenciaChange,
  onClearFilters,
  onView,
  onEdit,
  onDelete,
}: PolizasTableProps) {
  const [busquedaInput, setBusquedaInput] = useState(search);

  useEffect(() => {
    setBusquedaInput(search);
  }, [search]);

  const hayFiltrosActivos =
    Boolean(search.trim()) ||
    Boolean(busquedaInput.trim()) ||
    aseguradoraFilter !== 'TODAS' ||
    tipoVehiculoFilter !== 'TODOS' ||
    vigenciaFilter !== 'TODOS';

  const hoyStr = new Date().toISOString().slice(0, 10);

  const desdeRegistro = totalCount === 0 ? 0 : page * pageSize + 1;
  const hastaRegistro = Math.min((page + 1) * pageSize, totalCount);
  const paginasVisibles = generarPaginasVisibles(page, totalPages);

  const ejecutarBusqueda = () => {
    if (busquedaInput !== search) {
      onSearchChange(busquedaInput);
    } else if (page !== 0) {
      onPageChange(0);
    }
  };

  const handleLimpiarTodo = () => {
    setBusquedaInput('');
    onClearFilters();
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        {/* Buscador: ejecuta solo al presionar Enter */}
        <div className="relative flex-1" style={{ minWidth: '250px', maxWidth: '28rem' }}>
          <Search
            size={15}
            className="text-[#64748B]"
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                ejecutarBusqueda();
              }
            }}
            placeholder="Buscar por placa, propietario, documento... (Enter)"
            style={{
              ...controlBoxStyle,
              paddingLeft: '2.5rem',
              paddingRight: '0.875rem',
            }}
            className="w-full rounded-lg border border-[#E2E8F0] text-sm outline-none focus:border-[#0F172A] bg-white text-[#0F172A]"
          />
        </div>

        {/* Filtros alineados */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative inline-flex items-center">
            <select
              value={aseguradoraFilter}
              onChange={(e) => onAseguradoraChange(e.target.value)}
              aria-label="Filtrar por aseguradora"
              style={selectControlStyle}
              className="rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0F172A] cursor-pointer"
            >
              <option value="TODAS">Aseguradora: Todas</option>
              {aseguradoras.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="text-[#64748B]"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div className="relative inline-flex items-center">
            <select
              value={tipoVehiculoFilter}
              onChange={(e) => onTipoVehiculoChange(e.target.value)}
              aria-label="Filtrar por tipo de vehículo"
              style={selectControlStyle}
              className="rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0F172A] cursor-pointer"
            >
              <option value="TODOS">Vehículo: Todos</option>
              {tiposVehiculo.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="text-[#64748B]"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div className="relative inline-flex items-center">
            <select
              value={vigenciaFilter}
              onChange={(e) => onVigenciaChange(e.target.value as EstadoVigenciaFilter)}
              aria-label="Filtrar por vigencia"
              style={selectControlStyle}
              className="rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] outline-none focus:border-[#0F172A] cursor-pointer"
            >
              <option value="TODOS">Vigencia: Todas</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="POR_VENCER">Por vencer (30 días)</option>
              <option value="VENCIDA">Vencidas</option>
            </select>
            <ChevronDown
              size={14}
              className="text-[#64748B]"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={handleLimpiarTodo}
              style={controlBoxStyle}
              className="inline-flex items-center gap-1.5 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#0F172A] cursor-pointer"
            >
              <RotateCcw size={13} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
        <span>
          Mostrando{' '}
          <strong className="text-[#0F172A]">
            {desdeRegistro}–{hastaRegistro}
          </strong>{' '}
          de <strong className="text-[#0F172A]">{totalCount}</strong> pólizas
        </span>
        {totalPages > 1 && (
          <span>
            Página <strong className="text-[#0F172A]">{page + 1}</strong> de{' '}
            <strong className="text-[#0F172A]">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase text-[#64748B]">
              <th className="py-3 px-4">Placa / Vehículo</th>
              <th className="py-3 px-4">Propietario</th>
              <th className="py-3 px-4">Aseguradora</th>
              <th className="py-3 px-4">Vigencia (Desde - Hasta)</th>
              <th className="py-3 px-4">Valor SOAT</th>
              <th className="py-3 px-4">Uso Plataforma</th>
              <th className="py-3 px-4">Total a Pagar</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-sm">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#64748B]">
                  Cargando pólizas...
                </td>
              </tr>
            ) : polizas.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#64748B]">
                  No hay pólizas que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              polizas.map((p) => {
                const vigente = esPolizaVigente(p, hoyStr);
                return (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172A]">{p.placa}</div>
                      <div className="text-xs text-[#64748B]">{p.marcaLinea || p.tipoVehiculo}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{p.propietario || '—'}</div>
                      <div className="text-xs text-[#64748B]">
                        {p.tipoDocumento ? `${p.tipoDocumento} ` : ''}
                        {p.documento ?? ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">{p.aseguradora || '—'}</td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      <div className="text-[#475569]">
                        <span className="font-semibold text-[#0F172A]">Desde:</span>{' '}
                        {formatFechaLegible(p.desde)}
                      </div>
                      <div className="text-[#475569] mt-0.5">
                        <span className="font-semibold text-[#0F172A]">Hasta:</span>{' '}
                        <span className={vigente ? 'font-semibold text-[#15803D]' : 'font-semibold text-[#DC2626]'}>
                          {formatFechaLegible(p.hasta)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span
                          className={
                            vigente
                              ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#15803D]'
                              : 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-[#DC2626]'
                          }
                        >
                          {vigente ? 'Vigente' : 'Vencido'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{formatCOP(p.precioSoat)}</td>
                    <td className="py-3.5 px-4 font-medium text-[#16A34A] whitespace-nowrap">
                      {formatCOP(p.usoPlataforma)}
                    </td>
                    <td className="py-3.5 px-4 font-bold whitespace-nowrap">{formatCOP(p.totalPagar)}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onView(p)}
                          title="Ver detalle del SOAT"
                          aria-label={`Ver detalle de la póliza ${p.placa}`}
                          className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] bg-white cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          title="Editar uso de plataforma y datos"
                          className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] bg-white cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          title="Eliminar póliza"
                          className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-red-50 text-[#DC2626] bg-white cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación desde backend (se muestra cuando hay más de 1 página / > 10 registros) */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#64748B]">
            Mostrando <strong className="text-[#0F172A]">{desdeRegistro}</strong> a{' '}
            <strong className="text-[#0F172A]">{hastaRegistro}</strong> de{' '}
            <strong className="text-[#0F172A]">{totalCount}</strong> registros
          </span>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={loading || page <= 0}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>

            {paginasVisibles.map((item, idx) =>
              item === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-[#64748B]">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  disabled={loading}
                  className={
                    item === page
                      ? 'min-w-[2rem] px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold cursor-pointer'
                      : 'min-w-[2rem] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer'
                  }
                >
                  {item + 1}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={loading || page >= totalPages - 1}
              aria-label="Página siguiente"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}