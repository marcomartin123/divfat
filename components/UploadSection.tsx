
import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2, Download, Eye } from 'lucide-react';
import { PersonProfile, PersonKey, InvoiceFile } from '../types';

interface UploadSectionProps {
  onFileSelect: (file: File, payer: PersonKey) => void;
  isProcessing: boolean;
  personA: PersonProfile;
  personB: PersonProfile;
  uploadedInvoices: InvoiceFile[];
  onViewPdf: (fileData: string, fileName: string) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ 
  onFileSelect, 
  isProcessing, 
  personA, 
  personB,
  uploadedInvoices,
  onViewPdf
}) => {
  const [selectedPayer, setSelectedPayer] = useState<PersonKey>('PERSON_A');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0], selectedPayer);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file, selectedPayer);
      } else {
        alert("Por favor, envie apenas arquivos PDF.");
      }
    }
  }, [onFileSelect, isProcessing, selectedPayer]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center">
        <label className="text-sm font-medium text-slate-700 mb-2">Quem pagou esta fatura?</label>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setSelectedPayer('PERSON_A')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedPayer === 'PERSON_A' 
                ? `${personA.bgClass} ${personA.textClass} shadow-sm` 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{backgroundColor: personA.color}}></div>
            {personA.name}
          </button>
          <button
            onClick={() => setSelectedPayer('PERSON_B')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedPayer === 'PERSON_B' 
                ? `${personB.bgClass} ${personB.textClass} shadow-sm` 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{backgroundColor: personB.color}}></div>
            {personB.name}
          </button>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
          ${isProcessing ? 'border-indigo-300 bg-indigo-50 opacity-70 cursor-wait' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50 cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center justify-center space-y-3">
          {isProcessing ? (
            <>
              <div className="bg-indigo-100 p-3 rounded-full animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-indigo-900">Lendo Fatura de {selectedPayer === 'PERSON_A' ? personA.name : personB.name}...</h3>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-100 p-3 rounded-full group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Clique ou arraste a fatura</h3>
                <p className="text-xs text-slate-500 mt-1">O sistema irá extrair os dados automaticamente</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lista de Faturas Enviadas */}
      {uploadedInvoices.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-700">Faturas Processadas</h4>
          </div>
          <div className="divide-y divide-slate-200">
            {uploadedInvoices.map((invoice) => (
              <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${invoice.payer === 'PERSON_A' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900" title={invoice.fileName}>
                      {invoice.fileName}
                    </p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{formatDate(invoice.uploadDate)}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">Total: {formatCurrency(invoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => onViewPdf(invoice.fileData, invoice.fileName)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
