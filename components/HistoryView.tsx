
import React, { useRef } from 'react';
import { Process, ProcessStatus, PersonProfile } from '../types';
import { FileText, CheckCircle, Clock, Plus, Trash2, Download, UploadCloud, Cloud, CloudDownload } from 'lucide-react';

interface HistoryViewProps {
  processes: Process[];
  onOpenProcess: (process: Process) => void;
  personA: PersonProfile;
  personB: PersonProfile;
  onCreateNew: () => void;
  onResetData: () => void;
  onDeleteProcess: (id: string) => void;
  onExportData: () => void; // Local Download (Backup simples)
  onImportData: (file: File) => void; // Local Upload
  onSupabaseSave: () => void;
  onSupabaseLoad: () => void;
  isSyncing: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ 
  processes, 
  onOpenProcess, 
  onCreateNew, 
  onResetData,
  onDeleteProcess,
  onExportData,
  onImportData,
  onSupabaseSave,
  onSupabaseLoad,
  isSyncing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getProcessTotal = (process: Process) => {
    return process.transactions.reduce((acc, t) => acc + t.amount, 0);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportData(file);
    }
    // Reset value so we can select the same file again if needed
    if (event.target) event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Processos</h2>
          <p className="text-slate-500">Gerencie seus ciclos de divisão de contas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Cloud Actions */}
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 gap-1">
             <button 
                onClick={onSupabaseLoad}
                disabled={isSyncing}
                title="Baixar histórico da nuvem (Supabase)"
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                <CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Baixar Nuvem</span>
              </button>
              <div className="w-px bg-slate-200 my-1"></div>
              <button 
                onClick={onSupabaseSave}
                disabled={isSyncing}
                title="Salvar histórico na nuvem (Supabase)"
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Salvar Nuvem</span>
              </button>
          </div>

          <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>

          {/* Local Actions */}
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".json" 
            onChange={handleFileChange}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Importar arquivo local"
            className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
          </button>

          <button 
            onClick={onExportData}
            title="Download Backup (Arquivo timestamped)"
            className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button 
            onClick={onResetData}
            title="Apagar todos os dados"
            className="p-2.5 bg-white text-red-500 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button 
            onClick={onCreateNew}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-md shadow-indigo-200 active:scale-95 text-sm ml-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Mês</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {processes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">Nenhum histórico encontrado</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Clique em "Baixar Nuvem" para restaurar seus dados ou crie um novo mês.
            </p>
          </div>
        ) : (
          processes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(process => (
            <div 
              key={process.id}
              onClick={() => onOpenProcess(process)}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-12">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${process.status === ProcessStatus.CLOSED ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {process.status === ProcessStatus.CLOSED ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {process.name}
                    </h3>
                    <div className="flex gap-4 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {process.invoices.length} Faturas
                      </span>
                      <span>•</span>
                      <span>Criado em {formatDate(process.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-2xl font-bold text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getProcessTotal(process))}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      process.status === ProcessStatus.CLOSED 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {process.status === ProcessStatus.CLOSED ? 'FECHADO' : 'EM ABERTO'}
                    </span>
                    {process.status === ProcessStatus.CLOSED && (
                       <span className="text-xs text-slate-400">Comprovante OK</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete Button - Positioned absolute right */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevents opening the process
                  onDeleteProcess(process.id);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-10"
                title="Excluir este mês"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
