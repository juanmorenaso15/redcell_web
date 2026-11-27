export const formatCOP = (valor?: number | null): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));

export const buildWhatsappLink = (
  telefono: string | null | undefined,
  mensaje: string
): string | null => {
  if (!telefono) return null;
  const digits = telefono.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(mensaje)}`;
};