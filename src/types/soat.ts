export interface Poliza {
  id: number;
  tipoVehiculo: string;
  placa: string;
  propietario: string;
  tipoDocumento: string;
  documento: number;
  desde: string;
  hasta: string;
  marcaLinea: string;
  cilindraje: number;
  aseguradora: string;
  edadVehiculo: number;
  capacidadToneladas: number;
  precioSoat: number;
  usoPlataforma: number;
  totalPagar: number;
  activo: boolean;
  telefono: string | null;
  email: string | null;
}

export interface PolizaUpdateDTO {
  tipoVehiculo?: string;
  placa?: string;
  propietario?: string;
  tipoDocumento?: string;
  documento?: number;
  desde?: string;
  hasta?: string;
  marcaLinea?: string;
  cilindraje?: number;
  aseguradora?: string;
  edadVehiculo?: number;
  capacidadToneladas?: number;
  usoPlataforma?: number;
  telefono?: string;
  email?: string;
}

export interface AlertaRecordatorio {
  polizaId: number;
  placa: string;
  propietario: string;
  telefono: string | null;
  email: string | null;
  fechaVencimiento: string;
  tipoRecordatorio: 'MES_1' | 'DIAS_5' | 'DIA_1' | 'HOY';
  etiqueta: string;
  fechaProgramada: string;
  diasTranscurridos: number;
  enviadoEmail: boolean;
  enviadoWhatsapp: boolean;
  mensajeAlerta: string;
  whatsappUrl: string | null;
}

export interface ConfiguracionTarifa {
  id?: number;
  nombre: string;
  valor: number;
  activo: boolean;
}

export interface PerfilUsuario {
  id: number;
  email: string;
  username: string;
  rol: string;
}

export interface ActualizarPerfilDTO {
  username: string;
  email: string;
}

export interface RegistroUsuarioDTO {
  email: string;
  username: string;
  password: string;
  rol: string;
}

export interface UsuarioSistema {
  id: number;
  email: string;
  username: string;
  rol: string;
  estado?: boolean;
}