import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Coins,
  ExternalLink,
  Eye,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { ConfiguracionSection } from '../components/configuracion/ConfiguracionSection';
import { Sidebar, type SidebarSection } from '../components/layout/Sidebar';
import {
  construirEnlaceWhatsappDirecto,
  construirMensajeWhatsappConEmojis,
  copiarAlPortapapeles,
  DetallePolizaModal,
} from '../components/modals/DetallePolizaModal';
import { EditarPolizaModal } from '../components/modals/EditarPolizaModal';
import { SubirPdfModal } from '../components/modals/SubirPdfModal';
import { KpiCards } from '../components/polizas/KpiCards';
import { PolizasTable, type EstadoVigenciaFilter } from '../components/polizas/PolizasTable';
import { UsoPlataformaSection } from '../components/tarifas/UsoPlataformaSection';
import { UsuariosSection } from '../components/usuarios/UsuariosSection';
import { api } from '../services/api';
import type {
  ActualizarPerfilDTO,
  AlertaRecordatorio,
  ConfiguracionTarifa,
  PerfilUsuario,
  Poliza,
  PolizaUpdateDTO,
} from '../types/soat';
import { alertasSwal } from '../utils/alerts';
import { obtenerUsuarioSesion } from '../utils/auth';
import { formatCOP } from '../utils/format';

interface DashboardPageProps {
  onUnauthorized: () => void;
}

export function DashboardPage({ onUnauthorized }: DashboardPageProps) {
  const [polizas, setPolizas] = useState<Poliza[]>([]);
  const [alertas, setAlertas] = useState<AlertaRecordatorio[]>([]);
  const [tarifas, setTarifas] = useState<ConfiguracionTarifa[]>([]);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [sesionTick, setSesionTick] = useState(0);
  const [search, setSearch] = useState('');
  const [aseguradoraFilter, setAseguradoraFilter] = useState('TODAS');
  const [tipoVehiculoFilter, setTipoVehiculoFilter] = useState('TODOS');
  const [vigenciaFilter, setVigenciaFilter] = useState<EstadoVigenciaFilter>('TODOS');
  const [soloPendientesWhatsapp] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SidebarSection>('polizas');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingPoliza, setViewingPoliza] = useState<Poliza | null>(null);
  const [editingPoliza, setEditingPoliza] = useState<Poliza | null>(null);
  const [markingKey, setMarkingKey] = useState<string | null>(null);

  const usuario = useMemo(() => obtenerUsuarioSesion(), [sesionTick]);

  useEffect(() => {
    const actualizarViewport = () => {
      setIsDesktop(window.innerWidth >= 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', actualizarViewport);
    return () => window.removeEventListener('resize', actualizarViewport);
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingPerfil(true);
    try {
      const [listaPolizas, listaAlertas, listaTarifas, perfilUsuario] = await Promise.all([
        api.listarPolizas(),
        api.obtenerAlertas().catch(() => []),
        api.listarTarifas().catch(() => []),
        api.obtenerPerfil().catch(() => null),
      ]);
      setPolizas(listaPolizas);
      setAlertas(listaAlertas);
      setTarifas(listaTarifas);
      if (perfilUsuario) {
        setPerfil(perfilUsuario);
        setSesionTick((t) => t + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos';
      if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('token')) {
        onUnauthorized();
      } else {
        setFeedback(msg);
      }
    } finally {
      setLoading(false);
      setLoadingPerfil(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const tarifaActiva = useMemo(() => tarifas.find((t) => Boolean(t.activo)), [tarifas]);

  const alertasVisibles = useMemo(
    () =>
      soloPendientesWhatsapp
        ? alertas.filter((a) => !a.enviadoWhatsapp)
        : alertas,
    [alertas, soloPendientesWhatsapp]
  );

  const handleUploadPdf = async (file: File) => {
    const res = await api.subirPdf(file);
    await alertasSwal.exito('PDF procesado', res.message || 'Póliza cargada correctamente.');
    await cargarDatos();
  };

  const handleGuardarEdicion = async (id: number, dto: PolizaUpdateDTO) => {
    const actualizada = await api.actualizarPoliza(id, dto);
    await alertasSwal.exito(
      `Póliza ${actualizada.placa} actualizada`,
      `Uso de plataforma: ${formatCOP(actualizada.usoPlataforma)} · Total: ${formatCOP(actualizada.totalPagar)}`
    );
    await cargarDatos();
  };

  const handleEliminar = async (poliza: Poliza) => {
    const confirmado = await alertasSwal.confirmar(
      `¿Eliminar póliza ${poliza.placa}?`,
      `Se eliminará permanentemente el registro del SOAT de la placa ${poliza.placa}.`,
      'Sí, eliminar',
      true
    );
    if (!confirmado) return;

    try {
      await api.eliminarPoliza(poliza.id);
      await alertasSwal.exito('Póliza eliminada', `Se eliminó la póliza ${poliza.placa}.`);
      await cargarDatos();
    } catch (err: unknown) {
      await alertasSwal.error(
        'No se pudo eliminar',
        err instanceof Error ? err.message : 'Error al eliminar póliza'
      );
    }
  };

  const handleMarkWhatsappSent = async (polizaId: number, tipo: string) => {
    const key = `${polizaId}-${tipo}`;
    setMarkingKey(key);
    try {
      await api.marcarWhatsappEnviado(polizaId, tipo);
      await alertasSwal.toast('success', `Recordatorio (${tipo}) marcado como enviado`);
      await cargarDatos();
    } catch (err: unknown) {
      await alertasSwal.error(
        'Error al actualizar',
        err instanceof Error ? err.message : 'Error al marcar WhatsApp como enviado'
      );
    } finally {
      setMarkingKey(null);
    }
  };

  const handleEnviarEmailManual = async (poliza: Poliza) => {
    if (!poliza.email?.trim()) {
      await alertasSwal.advertencia(
        'Sin correo registrado',
        `La póliza ${poliza.placa} no tiene correo electrónico registrado.`
      );
      return;
    }
    try {
      await api.notificarPoliza(poliza.id, {
        email: poliza.email.trim(),
        gmail: true,
        whatsapp: false,
      });
      await alertasSwal.exito(
        'Correo encolado',
        `Recordatorio enviado a ${poliza.email.trim()} (Placa ${poliza.placa}).`
      );
    } catch (err: unknown) {
      await alertasSwal.error(
        'Error al enviar correo',
        err instanceof Error ? err.message : 'Error al encolar correo'
      );
    }
  };

  const handleSavePerfil = async (dto: ActualizarPerfilDTO) => {
    const actualizado = await api.actualizarPerfil(dto);
    setPerfil(actualizado);
    setSesionTick((t) => t + 1);
  };

  const handleCreateTarifa = async (nueva: Omit<ConfiguracionTarifa, 'id'>) => {
    await api.crearTarifa(nueva);
    await alertasSwal.exito(
      'Tarifa creada',
      `"${nueva.nombre}" guardada con valor de ${formatCOP(nueva.valor)}.`
    );
    await cargarDatos();
  };

  const handleUpdateTarifa = async (id: number, datos: Partial<ConfiguracionTarifa>) => {
    await api.actualizarTarifa(id, datos);
    await alertasSwal.exito('Tarifa actualizada', 'La configuración de uso de plataforma se guardó.');
    await cargarDatos();
  };

  const handleDeleteTarifa = async (id: number) => {
    const confirmado = await alertasSwal.confirmar(
      '¿Eliminar tarifa?',
      'Esta acción eliminará la tarifa seleccionada.',
      'Sí, eliminar',
      true
    );
    if (!confirmado) return;

    await api.eliminarTarifa(id);
    await alertasSwal.exito('Tarifa eliminada', 'La tarifa fue eliminada correctamente.');
    await cargarDatos();
  };

  const handleApplyTarifaToPolizas = async (valor: number, soloSinTarifa: boolean) => {
    const objetivos = soloSinTarifa
      ? polizas.filter((p) => Number(p.usoPlataforma || 0) === 0)
      : polizas;

    if (objetivos.length === 0) {
      await alertasSwal.advertencia(
        'Sin pólizas pendientes',
        'No hay pólizas con uso de plataforma en $0.'
      );
      return;
    }

    await Promise.all(
      objetivos.map((p) =>
        api.actualizarPoliza(p.id, {
          placa: p.placa,
          tipoVehiculo: p.tipoVehiculo,
          marcaLinea: p.marcaLinea,
          cilindraje: p.cilindraje,
          aseguradora: p.aseguradora,
          edadVehiculo: p.edadVehiculo,
          capacidadToneladas: p.capacidadToneladas,
          desde: p.desde,
          hasta: p.hasta,
          propietario: p.propietario,
          tipoDocumento: p.tipoDocumento,
          documento: p.documento,
          usoPlataforma: valor,
          telefono: p.telefono ?? '',
          email: p.email ?? '',
        })
      )
    );

    await alertasSwal.exito(
      'Tarifa aplicada',
      `Uso de plataforma (${formatCOP(valor)}) aplicado a ${objetivos.length} póliza(s).`
    );
    await cargarDatos();
  };

  const aseguradoras = useMemo(() => {
    const set = new Set<string>();
    polizas.forEach((p) => {
      if (p.aseguradora?.trim()) set.add(p.aseguradora.trim());
    });
    return Array.from(set).sort();
  }, [polizas]);

  const tiposVehiculo = useMemo(() => {
    const set = new Set<string>();
    polizas.forEach((p) => {
      if (p.tipoVehiculo?.trim()) set.add(p.tipoVehiculo.trim());
    });
    return Array.from(set).sort();
  }, [polizas]);

  const polizasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hoyStr = new Date().toISOString().slice(0, 10);

    return polizas.filter((p) => {
      if (q) {
        const matchesSearch =
          p.placa?.toLowerCase().includes(q) ||
          p.propietario?.toLowerCase().includes(q) ||
          String(p.documento ?? '').includes(q) ||
          p.aseguradora?.toLowerCase().includes(q) ||
          p.marcaLinea?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (aseguradoraFilter !== 'TODAS' && p.aseguradora?.trim() !== aseguradoraFilter) {
        return false;
      }

      if (tipoVehiculoFilter !== 'TODOS' && p.tipoVehiculo?.trim() !== tipoVehiculoFilter) {
        return false;
      }

      if (vigenciaFilter !== 'TODOS') {
        const estaVigente = Boolean(p.activo) && (!p.hasta || p.hasta >= hoyStr);
        if (vigenciaFilter === 'VIGENTES' && !estaVigente) return false;
        if (vigenciaFilter === 'VENCIDOS' && estaVigente) return false;
      }

      return true;
    });
  }, [polizas, search, aseguradoraFilter, tipoVehiculoFilter, vigenciaFilter]);

  const handleClearFilters = () => {
    setSearch('');
    setAseguradoraFilter('TODAS');
    setTipoVehiculoFilter('TODOS');
    setVigenciaFilter('TODOS');
  };

  const totalPlataforma = useMemo(
    () => polizas.reduce((acc, p) => acc + Number(p.usoPlataforma || 0), 0),
    [polizas]
  );

  const tituloHeader =
    activeSection === 'configuracion'
      ? 'Configuración'
      : activeSection === 'usuarios'
        ? 'Usuarios y equipo'
        : activeSection === 'tarifas'
          ? 'Uso de plataforma'
          : activeSection === 'alertas'
            ? 'Alertas y recordatorios'
            : 'Base de datos SOAT';

  const subtituloHeader =
    activeSection === 'configuracion'
      ? 'Gestiona tu perfil de usuario y contraseña.'
      : activeSection === 'usuarios'
        ? 'Registra nuevos administradores u operadores para acceder a RedCell SOAT.'
        : activeSection === 'tarifas'
          ? 'Administra las tarifas de uso de plataforma y aplícalas a las pólizas.'
          : activeSection === 'alertas'
            ? 'Revisa y gestiona las alertas de vencimiento programadas.'
            : 'Consulta, carga PDFs, edita pólizas y gestiona uso de plataforma y recordatorios.';

  const botonUsuarioConfig = (
    <button
      type="button"
      onClick={() => setActiveSection('configuracion')}
      title="Abrir configuración de perfil"
      className={
        activeSection === 'configuracion'
          ? 'flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#F1F5F9] border border-[#0F172A] shadow-sm shrink-0 cursor-pointer text-left w-full sm:w-auto'
          : 'flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-sm shrink-0 cursor-pointer text-left w-full sm:w-auto'
      }
    >
      <img
        src="/logo-redcell.png"
        alt={usuario.nombre}
        className="h-8 w-8 rounded-full object-contain bg-[#F8FAFC] p-1 border border-[#E2E8F0] shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="leading-tight whitespace-nowrap min-w-0">
        <div className="text-xs font-bold text-[#0F172A] truncate">{usuario.nombre}</div>
        <div className="text-[11px] text-[#64748B] truncate">
          {usuario.rol} ·{' '}
          <span className="font-medium text-[#0F172A]">{usuario.username}</span>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] text-[#0F172A] w-full">
      {/* Barra superior móvil (< md) */}
      <div className="flex md:hidden items-center justify-between gap-2 px-4 py-3 bg-white border-b border-[#E2E8F0] w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
            className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer shrink-0"
          >
            <Menu size={18} />
          </button>
          <img
            src="/logo-redcell.png"
            alt="RedCell"
            className="h-8 w-auto object-contain shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="font-bold text-sm leading-tight font-headline truncate">
            RedCell SOAT
          </span>
        </div>

        <button
          type="button"
          onClick={onUnauthorized}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#64748B] hover:text-[#DC2626] cursor-pointer shrink-0"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>

      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        alertasCount={alertas.length}
        tarifaActivaValor={tarifaActiva?.valor}
        onLogout={onUnauthorized}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main
        style={{
          paddingLeft: isDesktop ? '19.5rem' : '1rem',
          paddingRight: isDesktop ? '2rem' : '1rem',
          paddingTop: isDesktop ? '2rem' : '1.25rem',
          paddingBottom: isDesktop ? '2.5rem' : '2rem',
        }}
        className="flex-1 min-w-0 max-w-none w-full"
      >
        <div className="w-full px-0 sm:px-2 lg:px-4 space-y-6">
          <header className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 pt-1">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] m-0 font-headline">
                {tituloHeader}
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 mb-0">{subtituloHeader}</p>
            </div>

            {/* En móvil: tarjeta de usuario arriba de los botones */}
            <div className="block sm:hidden">{botonUsuarioConfig}</div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveSection('polizas')}
                  className={
                    activeSection === 'polizas'
                      ? 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#0F172A] bg-[#0F172A] text-white flex-1 sm:flex-initial'
                      : 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] flex-1 sm:flex-initial'
                  }
                >
                  <ShieldCheck size={16} className="shrink-0" />
                  Pólizas ({polizas.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('alertas')}
                  className={
                    activeSection === 'alertas'
                      ? 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#D97706] bg-[#D97706] text-white flex-1 sm:flex-initial'
                      : 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] flex-1 sm:flex-initial'
                  }
                >
                  <Bell size={16} className="shrink-0" />
                  Alertas ({alertas.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('tarifas')}
                  className={
                    activeSection === 'tarifas'
                      ? 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#16A34A] bg-[#16A34A] text-white flex-1 sm:flex-initial'
                      : 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] flex-1 sm:flex-initial'
                  }
                >
                  <Coins size={16} className="shrink-0" />
                  Uso de plataforma
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('usuarios')}
                  className={
                    activeSection === 'usuarios'
                      ? 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#0F172A] bg-[#0F172A] text-white flex-1 sm:flex-initial'
                      : 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F1F5F9] flex-1 sm:flex-initial'
                  }
                >
                  <UserPlus size={16} className="shrink-0" />
                  Usuarios
                </button>

                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer border-0 w-full sm:w-auto"
                >
                  <Plus size={16} className="shrink-0" />
                  Subir SOAT PDF
                </button>
              </div>

              {/* En tablet y escritorio: a la derecha de los botones */}
              <div className="hidden sm:block">{botonUsuarioConfig}</div>
            </div>
          </header>

          {feedback && (
            <div className="px-4 py-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-3 text-sm">
              <span>{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-[#64748B] hover:text-[#0F172A] bg-transparent border-0 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <KpiCards totalPolizas={polizas.length} totalPlataforma={totalPlataforma} />

          {activeSection === 'polizas' ? (
            <PolizasTable
              polizas={polizasFiltradas}
              totalCount={polizas.length}
              loading={loading}
              search={search}
              onSearchChange={setSearch}
              aseguradoraFilter={aseguradoraFilter}
              onAseguradoraChange={setAseguradoraFilter}
              aseguradoras={aseguradoras}
              tipoVehiculoFilter={tipoVehiculoFilter}
              onTipoVehiculoChange={setTipoVehiculoFilter}
              tiposVehiculo={tiposVehiculo}
              vigenciaFilter={vigenciaFilter}
              onVigenciaChange={setVigenciaFilter}
              onClearFilters={handleClearFilters}
              onView={(p) => setViewingPoliza(p)}
              onEdit={(p) => setEditingPoliza(p)}
              onDelete={handleEliminar}
            />
          ) : activeSection === 'tarifas' ? (
            <UsoPlataformaSection
              tarifas={tarifas}
              polizas={polizas}
              loading={loading}
              onCreateTarifa={handleCreateTarifa}
              onUpdateTarifa={handleUpdateTarifa}
              onDeleteTarifa={handleDeleteTarifa}
              onApplyTarifaToPolizas={handleApplyTarifaToPolizas}
            />
          ) : activeSection === 'usuarios' ? (
            <UsuariosSection onIrAConfiguracion={() => setActiveSection('configuracion')} />
          ) : activeSection === 'configuracion' ? (
            <ConfiguracionSection
              perfil={perfil}
              loadingPerfil={loadingPerfil}
              tarifaActivaValor={tarifaActiva?.valor}
              onSavePerfil={handleSavePerfil}
              onIrATarifas={() => setActiveSection('tarifas')}
            />
          ) : (
            <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-base font-bold m-0 font-headline">
                    Alertas y recordatorios de vencimiento
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.7 mb-4">
                    Ventanas: 1 mes, 5 días, 1 día y mismo día. Enviar WhatsApp copia el mensaje y abre el chat.
                  </p>
                </div>
              </div>

              {alertasVisibles.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-6 m-0">
                  {soloPendientesWhatsapp
                    ? 'No hay alertas pendientes de WhatsApp con este filtro.'
                    : 'No hay alertas pendientes en este momento.'}
                </p>
              ) : (
                <div className="alertas-grid">
                  {alertasVisibles.map((alerta) => {
                    const key = `${alerta.polizaId}-${alerta.tipoRecordatorio}`;
                    const polizaAsociada = polizas.find((p) => p.id === alerta.polizaId);
                    const mensajeAlertaEmojis = polizaAsociada
                      ? construirMensajeWhatsappConEmojis(polizaAsociada, alerta.etiqueta)
                      : alerta.mensajeAlerta;
                    const telefonoWa = alerta.telefono ?? polizaAsociada?.telefono;
                    const waLink = construirEnlaceWhatsappDirecto(telefonoWa, mensajeAlertaEmojis);

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3.5 min-w-0"
                      >
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-sm text-[#0F172A] font-headline">
                                {alerta.placa}
                              </span>
                              {polizaAsociada && (
                                <button
                                  type="button"
                                  onClick={() => setViewingPoliza(polizaAsociada)}
                                  title="Ver detalle del SOAT"
                                  aria-label={`Ver detalle del SOAT de la placa ${alerta.placa}`}
                                  className="inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded p-1 cursor-pointer"
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-[#92400E] truncate">
                              {alerta.etiqueta}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-[#0F172A] truncate">
                            {alerta.propietario || polizaAsociada?.propietario || 'Cliente'}
                          </div>

                          <div className="text-[11px] text-[#64748B] flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar size={11} className="shrink-0" />
                              <span>
                                Vence: <strong className="text-[#0F172A]">{alerta.fechaVencimiento}</strong>
                              </span>
                            </span>
                            <span>{alerta.diasTranscurridos}d</span>
                          </div>

                          <div className="text-[11px] text-[#64748B] flex items-center justify-between gap-2">
                            <span>Prog: {alerta.fechaProgramada}</span>
                            <span>
                              WA:{' '}
                              <strong
                                className={alerta.enviadoWhatsapp ? 'text-[#15803D]' : 'text-[#D97706]'}
                              >
                                {alerta.enviadoWhatsapp ? 'Enviado' : 'Pendiente'}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-3 border-t border-[#E2E8F0]">
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={async (e) => {
                                e.preventDefault();
                                await copiarAlPortapapeles(mensajeAlertaEmojis);
                                window.open(waLink, '_blank', 'noopener,noreferrer');
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex-1 whitespace-nowrap"
                              style={{ textDecoration: 'none' }}
                            >
                              <ExternalLink size={12} className="shrink-0" />
                              WhatsApp
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#64748B] flex-1 truncate">
                              Sin teléfono
                            </span>
                          )}

                          {!alerta.enviadoWhatsapp ? (
                            <button
                              type="button"
                              disabled={markingKey === key}
                              onClick={() =>
                                handleMarkWhatsappSent(alerta.polizaId, alerta.tipoRecordatorio)
                              }
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer whitespace-nowrap"
                            >
                              <CheckCircle2 size={12} className="text-[#16A34A] shrink-0" />
                              {markingKey === key ? '...' : 'Marcar'}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-[#15803D] text-[11px] font-semibold whitespace-nowrap">
                              <CheckCircle2 size={12} className="shrink-0" /> Enviado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <SubirPdfModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUploadPdf}
      />

      <DetallePolizaModal
        poliza={viewingPoliza}
        alertas={alertas}
        onClose={() => setViewingPoliza(null)}
        onEdit={(p) => setEditingPoliza(p)}
        onMarkWhatsappSent={handleMarkWhatsappSent}
        onSendEmail={handleEnviarEmailManual}
      />

      <EditarPolizaModal
        poliza={editingPoliza}
        onClose={() => setEditingPoliza(null)}
        onSave={handleGuardarEdicion}
      />
    </div>
  );
}