import Swal from 'sweetalert2';

const baseSwal = Swal.mixin({
  confirmButtonColor: '#0F172A',
  cancelButtonColor: '#64748B',
  customClass: {
    popup: 'rounded-2xl border border-[#E2E8F0] shadow-sm',
    title: 'text-lg font-bold text-[#0F172A]',
    htmlContainer: 'text-sm text-[#475569]',
    confirmButton: 'rounded-lg px-4 py-2 text-xs font-semibold',
    cancelButton: 'rounded-lg px-4 py-2 text-xs font-semibold',
  },
});

export const alertasSwal = {
  exito: (titulo: string, texto?: string) =>
    baseSwal.fire({
      icon: 'success',
      title: titulo,
      text: texto,
      confirmButtonColor: '#16A34A',
      timer: 2600,
      timerProgressBar: true,
    }),

  error: (titulo: string, texto?: string) =>
    baseSwal.fire({
      icon: 'error',
      title: titulo,
      text: texto || 'Ocurrió un error inesperado.',
      confirmButtonColor: '#DC2626',
    }),

  advertencia: (titulo: string, texto?: string) =>
    baseSwal.fire({
      icon: 'warning',
      title: titulo,
      text: texto,
      confirmButtonColor: '#D97706',
    }),

  confirmar: async (
    titulo: string,
    texto: string,
    textoConfirmar = 'Sí, continuar',
    peligroso = false
  ): Promise<boolean> => {
    const res = await baseSwal.fire({
      icon: peligroso ? 'warning' : 'question',
      title: titulo,
      text: texto,
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: peligroso ? '#DC2626' : '#0F172A',
      reverseButtons: true,
    });
    return res.isConfirmed;
  },

  toast: (icon: 'success' | 'error' | 'info' | 'warning', title: string) =>
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 2400,
      timerProgressBar: true,
    }),
};