import { useState, type FormEvent } from 'react';
import { FileUp, X } from 'lucide-react';
import { alertasSwal } from '../../utils/alerts';

interface SubirPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

export function SubirPdfModal({ isOpen, onClose, onUpload }: SubirPdfModalProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setPdfFile(null);
      return;
    }
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      setPdfFile(null);
      await alertasSwal.advertencia('Archivo no válido', 'Solo se admiten documentos en formato PDF.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setPdfFile(null);
      await alertasSwal.advertencia(
        'Archivo muy pesado',
        'El tamaño máximo permitido para el PDF es de 10 MB.'
      );
      return;
    }
    setPdfFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      await alertasSwal.advertencia('Selecciona un PDF', 'Elige el archivo PDF del SOAT antes de subir.');
      return;
    }
    setUploading(true);
    try {
      await onUpload(pdfFile);
      setPdfFile(null);
      onClose();
    } catch (err: unknown) {
      await alertasSwal.error(
        'Error al procesar PDF',
        err instanceof Error ? err.message : 'No se pudo procesar el archivo PDF.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold m-0 font-headline">Subir SOAT en PDF</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] bg-transparent border-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 cursor-pointer hover:border-[#DC2626]">
            <FileUp size={28} className="text-[#DC2626] mb-2" />
            <span className="text-sm font-medium text-center">
              {pdfFile ? pdfFile.name : 'Selecciona el PDF de Previsora o AXA Colpatria'}
            </span>
            <span className="text-[11px] text-[#64748B] mt-1">Formato PDF · Máximo 10 MB</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm bg-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!pdfFile || uploading}
              className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold border-0 cursor-pointer disabled:opacity-60"
            >
              {uploading ? 'Procesando...' : 'Subir y calcular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}