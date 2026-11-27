import { useState } from 'react';
import {
  Bell,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { AlertaRecordatorio, Poliza } from '../../types/soat';

interface DetallePolizaModalProps {
  poliza: Poliza | null;
  alertas: AlertaRecordatorio[];
  onClose: () => void;
  onEdit: (poliza: Poliza) => void;
  onMarkWhatsappSent?: (polizaId: number, tipo: string) => Promise<void>;
  onSendEmail?: (poliza: Poliza) => Promise<void>;
}

const EMOJI = {
  sparkle: String.fromCodePoint(0x2728),
  hourglass: String.fromCodePoint(0x23f3),
  user: String.fromCodePoint(0x1f464),
  id: String.fromCodePoint(0x1f194),
  pointRight: String.fromCodePoint(0x1f449),
  calendar: String.fromCodePoint(0x1f4c5),
  moneyBag: String.fromCodePoint(0x1f4b0),
  gear: String.fromCodePoint(0x2699),
  dollar: String.fromCodePoint(0x1f4b5),
  redCircle: String.fromCodePoint(0x1f534),
  manOffice: String.fromCodePoint(0x1f935),
  phone: String.fromCodePoint(0x1f4de),
  pin: String.fromCodePoint(0x1f4cd),
  city: String.fromCodePoint(0x1f3d9),
} as const;

function formatFechaDdMmYyyy(isoOrDate?: string | null): string {
  if (!isoOrDate) return 'Sin fecha';
  const limpio = isoOrDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpio);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return limpio;
}

function formatMonedaRedcell(valor?: number | null): string {
  const numero = Math.max(0, Math.round(Number(valor || 0)));
  return `$${numero.toLocaleString('es-CO')}`;
}

function construirDescripcionVehiculo(poliza: Poliza): string {
  const marcaLinea = poliza.marcaLinea?.trim();
  const tipoVehiculo = poliza.tipoVehiculo?.trim();

  if (marcaLinea && tipoVehiculo) {
    return `${marcaLinea} (${tipoVehiculo})`;
  }
  if (marcaLinea) return marcaLinea;
  if (tipoVehiculo) return tipoVehiculo;
  return 'Vehículo';
}

export function construirMensajeWhatsappConEmojis(poliza: Poliza, etiquetaPlazo?: string): string {
  const totalPagar = Number(poliza.totalPagar || 0);
  const usoPlataforma = Number(poliza.usoPlataforma || 0);
  const valorSoatCalculado =
    poliza.precioSoat != null
      ? Number(poliza.precioSoat)
      : Math.max(0, totalPagar - usoPlataforma);

  const propietario = poliza.propietario?.trim() || 'No registrado';
  const tipoDoc = poliza.tipoDocumento?.trim() || '';
  const numDoc = poliza.documento != null ? String(poliza.documento).trim() : '';
  const documentoCompleto = `${tipoDoc} ${numDoc}`.trim() || 'No registrado';

  const placa = poliza.placa?.trim() || 'Sin placa';
  const vehiculoDetalle = construirDescripcionVehiculo(poliza);
  const venceEl = formatFechaDdMmYyyy(poliza.hasta);

  const lineas: string[] = [
    `${EMOJI.sparkle} *RECORDATORIO DE SOAT* ${EMOJI.sparkle}`,
    '',
  ];

  if (etiquetaPlazo && etiquetaPlazo.trim()) {
    lineas.push(`${EMOJI.hourglass} *Aviso:* ${etiquetaPlazo.trim()}`, '');
  }

  lineas.push(
    'Muy buenos dias. Le informamos que el SOAT para el vehículo de:',
    '',
    `${EMOJI.user} *PROPIETARIO:* ${propietario}`,
    `${EMOJI.id} *DOCUMENTO:* ${documentoCompleto}`,
    `${EMOJI.pointRight} *VEHÍCULO:* (${placa}) - ${vehiculoDetalle}`,
    '',
    `${EMOJI.calendar} *VENCE EL:* ${venceEl}`,
    `${EMOJI.moneyBag} *VALOR SOAT:* ${formatMonedaRedcell(valorSoatCalculado)}`,
    `${EMOJI.gear} *USO PLATAFORMA:* ${formatMonedaRedcell(usoPlataforma)}`,
    `${EMOJI.dollar} *TOTAL A PAGAR:* ${formatMonedaRedcell(totalPagar)}`,
    '',
    '--------------------------------------------',
    '',
    `${EMOJI.redCircle} *Más info:* REDCELL.COM`,
    '',
    `${EMOJI.manOffice} *Atendido por:* Yhan Alejandro Moreno Gonzalez`,
    '',
    `${EMOJI.phone} *WhatsApp:* 3117034142`,
    '',
    `${EMOJI.pin} *Ubicación:* Calle 23 No 15-35 (Por Ventanilla verde)`,
    '',
    `${EMOJI.city} Armenia, Quindío`
  );

  return lineas.join('\n');
}

export function construirEnlaceWhatsappDirecto(
  telefono: string | null | undefined,
  mensaje: string
): string | null {
  if (!telefono) return null;
  let digits = telefono.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `57${digits}`;
  }
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const baseUrl = esMovil
    ? 'https://api.whatsapp.com/send'
    : 'https://web.whatsapp.com/send';
  return `${baseUrl}?phone=${digits}&text=${encodeURIComponent(mensaje)}`;
}

export async function copiarAlPortapapeles(texto: string): Promise<void> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(texto);
      return;
    }
  } catch {
    // Fallback abajo
  }

  const textarea = document.createElement('textarea');
  textarea.value = texto;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function DetallePolizaModal({
  poliza,
  alertas,
  onClose,
  onEdit,
  onMarkWhatsappSent,
  onSendEmail,
}: DetallePolizaModalProps) {
  const [copiado, setCopiado] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);

  if (!poliza) return null;

  const hoyStr = new Date().toISOString().slice(0, 10);
  const estaVigente = Boolean(poliza.activo) && (!poliza.hasta || poliza.hasta >= hoyStr);

  const alertasPoliza = alertas.filter((a) => a.polizaId === poliza.id);
  const alertaActiva = alertasPoliza[0];

  const textoConEmojis = construirMensajeWhatsappConEmojis(poliza, alertaActiva?.etiqueta);
  const waUrl = construirEnlaceWhatsappDirecto(poliza.telefono, textoConEmojis);

  const handleCopiar = async () => {
    try {
      await copiarAlPortapapeles(textoConEmojis);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const handleAbrirWhatsapp = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!waUrl) return;
    e.preventDefault();
    await copiarAlPortapapeles(textoConEmojis);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMarcarEnviado = async (tipo: string) => {
    if (!onMarkWhatsappSent) return;
    setMarcando(tipo);
    try {
      await onMarkWhatsappSent(poliza.id, tipo);
    } finally {
      setMarcando(null);
    }
  };

  const handleEnviarCorreo = async () => {
    if (!onSendEmail || !poliza.email?.trim()) return;
    setEnviandoCorreo(true);
    try {
      await onSendEmail(poliza);
    } finally {
      setEnviandoCorreo(false);
    }
  };

  return (
    <div
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de póliza ${poliza.placa}`}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.56)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        zIndex: 50,
        overflowY: 'auto',
      }}
      className="flex items-start sm:items-center justify-center p-3 sm:p-6"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          padding: '1.25rem 1.5rem',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        className="bg-white rounded-2xl border border-[#E2E8F0] w-full max-w-4xl shadow-2xl mx-auto"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#E2E8F0]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-lg sm:text-2xl font-bold text-[#0F172A] font-headline">
                <ShieldCheck size={22} className="text-[#DC2626] shrink-0" />
                {poliza.placa}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
                {poliza.aseguradora || 'Aseguradora'}
              </span>
              <span
                className={
                  estaVigente
                    ? 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200'
                    : 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200'
                }
              >
                {estaVigente ? 'Vigente' : 'Vencida'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1 mb-0">
              Póliza #{poliza.id} · {poliza.marcaLinea || poliza.tipoVehiculo || 'Vehículo'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Resumen financiero */}
        <div className="modal-finanzas-grid border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]">
          <div className="px-4 py-2.5 bg-white border-b sm:border-b-0 sm:border-r border-[#E2E8F0]">
            <div className="text-[11px] font-medium text-[#64748B]">Valor SOAT</div>
            <div className="text-base sm:text-lg font-bold text-[#0F172A] mt-0.5 font-headline">
              {formatMonedaRedcell(poliza.precioSoat)}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-white border-b sm:border-b-0 sm:border-r border-[#E2E8F0]">
            <div className="text-[11px] font-medium text-[#64748B]">Uso de plataforma</div>
            <div className="text-base sm:text-lg font-bold text-[#16A34A] mt-0.5 font-headline">
              {formatMonedaRedcell(poliza.usoPlataforma)}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-red-50/90">
            <div className="text-[11px] font-semibold text-[#DC2626]">Total a pagar</div>
            <div className="text-lg sm:text-xl font-bold text-[#DC2626] mt-0.5 font-headline">
              {formatMonedaRedcell(poliza.totalPagar)}
            </div>
          </div>
        </div>

        {/* Dos cuadros lado a lado en tablet/escritorio, apilados en móvil */}
        <div className="modal-datos-grid">
          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0F172A] pb-2 mb-1 border-b border-[#E2E8F0]">
              <Car size={14} className="text-[#DC2626] shrink-0" />
              Datos del vehículo
            </div>

            <div className="divide-y divide-[#F1F5F9] text-xs sm:text-sm">
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Clase / Tipo</span>
                <span className="font-semibold text-[#0F172A] text-right truncate">
                  {poliza.tipoVehiculo || '—'}
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Marca y línea</span>
                <span className="font-semibold text-[#0F172A] text-right truncate">
                  {poliza.marcaLinea || '—'}
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Cilindraje</span>
                <span className="font-semibold text-[#0F172A]">
                  {poliza.cilindraje ? `${poliza.cilindraje} cc` : '—'}
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Edad del vehículo</span>
                <span className="font-semibold text-[#0F172A]">{poliza.edadVehiculo ?? 0} años</span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Capacidad</span>
                <span className="font-semibold text-[#0F172A]">
                  {poliza.capacidadToneladas ?? 0} ton
                </span>
              </div>
            </div>
          </div>

          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-white min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0F172A] pb-2 mb-1 border-b border-[#E2E8F0]">
              <User size={14} className="text-[#0F172A] shrink-0" />
              Propietario y vigencia
            </div>

            <div className="divide-y divide-[#F1F5F9] text-xs sm:text-sm">
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-[#64748B] shrink-0">Propietario</span>
                <span className="font-semibold text-[#0F172A] text-right truncate">
                  {poliza.propietario || '—'}
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[#64748B] shrink-0">
                  <FileText size={13} />
                  Identificación
                </span>
                <span className="font-semibold text-[#0F172A] text-right truncate">
                  {poliza.tipoDocumento || 'DOC'} {poliza.documento ?? '—'}
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[#64748B] shrink-0">
                  <Calendar size={13} />
                  Vigencia
                </span>
                <span className="text-xs font-medium text-[#0F172A] text-right whitespace-nowrap">
                  {formatFechaDdMmYyyy(poliza.desde)} →{' '}
                  <span
                    className={
                      estaVigente ? 'font-bold text-[#15803D]' : 'font-bold text-[#DC2626]'
                    }
                  >
                    {formatFechaDdMmYyyy(poliza.hasta)}
                  </span>
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[#64748B] shrink-0">
                  <Phone size={13} className="text-[#16A34A]" />
                  Teléfono
                </span>
                <span className="font-medium text-[#0F172A] text-right truncate">
                  {poliza.telefono || 'Sin registrar'}
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[#64748B] shrink-0">
                  <Mail size={13} />
                  Correo
                </span>
                <span className="font-medium text-[#0F172A] text-right truncate max-w-[190px]">
                  {poliza.email || 'Sin registrar'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recordatorios */}
        <div className="border border-[#E2E8F0] rounded-xl px-4 py-2.5 bg-[#F8FAFC] mb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0F172A] mb-0.5">
            <Bell size={13} className="text-[#D97706] shrink-0" />
            Recordatorios de vencimiento ({alertasPoliza.length})
          </div>

          {alertasPoliza.length === 0 ? (
            <p className="text-xs text-[#64748B] m-0">
              Sin recordatorios pendientes para esta póliza en este momento.
            </p>
          ) : (
            <div className="space-y-1.5 mt-1.5">
              {alertasPoliza.map((alerta) => (
                <div
                  key={`${alerta.polizaId}-${alerta.tipoRecordatorio}`}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <strong className="text-[#0F172A]">{alerta.etiqueta}</strong>{' '}
                    <span className="text-[#64748B]">
                      · Vence {formatFechaDdMmYyyy(alerta.fechaVencimiento)} ({alerta.diasTranscurridos} días)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {alerta.enviadoWhatsapp ? (
                      <span className="inline-flex items-center gap-1 text-[#16A34A] font-semibold">
                        <CheckCircle2 size={14} /> WhatsApp enviado
                      </span>
                    ) : (
                      onMarkWhatsappSent && (
                        <button
                          type="button"
                          disabled={marcando === alerta.tipoRecordatorio}
                          onClick={() => handleMarcarEnviado(alerta.tipoRecordatorio)}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] font-semibold text-[#0F172A] cursor-pointer"
                        >
                          {marcando === alerta.tipoRecordatorio ? 'Guardando...' : 'Marcar enviado'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones inferiores */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={handleCopiar}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer w-full sm:w-auto"
          >
            {copiado ? <Check size={14} className="text-[#16A34A]" /> : <Copy size={14} />}
            {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            {onSendEmail && (
              <button
                type="button"
                disabled={!poliza.email?.trim() || enviandoCorreo}
                onClick={handleEnviarCorreo}
                title={
                  poliza.email?.trim()
                    ? `Enviar recordatorio a ${poliza.email.trim()}`
                    : 'Sin correo registrado'
                }
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
              >
                <Mail size={14} className="text-[#0E3B72]" />
                {enviandoCorreo ? 'Enviando correo...' : 'Enviar correo'}
              </button>
            )}

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                onClick={handleAbrirWhatsapp}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex-1 sm:flex-initial whitespace-nowrap"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                Enviar por WhatsApp
              </a>
            ) : (
              <span className="text-xs text-[#64748B] px-2">
                Sin teléfono para abrir WhatsApp (puedes copiar el mensaje)
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(poliza);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold border-0 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Edit3 size={14} />
              Editar póliza
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}