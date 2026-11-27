import { formatCOP } from '../../utils/format';

interface KpiCardsProps {
  totalPolizas: number;
  totalPlataforma: number;
}

export function KpiCards({ totalPolizas, totalPlataforma }: KpiCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="text-xs font-medium text-[#64748B]">SOAT vigentes</div>
        <div className="text-2xl font-bold mt-1 font-headline">{totalPolizas}</div>
      </div>
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="text-xs font-medium text-[#64748B]">Acumulado uso de plataforma</div>
        <div className="text-2xl font-bold mt-1 text-[#16A34A] font-headline">
          {formatCOP(totalPlataforma)}
        </div>
      </div>
    </section>
  );
}