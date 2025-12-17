
import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { TransactionTable } from './components/TransactionTable';
import { Summary } from './components/Summary';
import { ManualEntry } from './components/ManualEntry';
import { HistoryView } from './components/HistoryView';
import { parseInvoicePDF } from './services/geminiService';
import { saveBackupToSupabase, loadBackupFromSupabase } from './services/supabaseService';
import { Transaction, Assignment, DEFAULT_PEOPLE, PersonProfile, Process, ProcessStatus, InvoiceFile, PersonKey } from './types';
import { Receipt, AlertCircle, X, ChevronLeft, AlertTriangle, UploadCloud, Trash2 } from 'lucide-react';

// Safe ID generator
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  
  // New Process Modal State
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  
  // Pending Debt Logic
  const [pendingDebtProcess, setPendingDebtProcess] = useState<Process | null>(null);

  // Carry Over Logic (Modal State)
  const [carryOverData, setCarryOverData] = useState<{debtor: PersonKey, amount: number} | null>(null);

  // Deletion Modals State
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [processToDeleteId, setProcessToDeleteId] = useState<string | null>(null);

  // Settings
  const [personA, setPersonA] = useState<PersonProfile>(DEFAULT_PEOPLE.PERSON_A);
  const [personB, setPersonB] = useState<PersonProfile>(DEFAULT_PEOPLE.PERSON_B);

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('invoice_app_data_v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProcesses(parsed);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('invoice_app_data_v1', JSON.stringify(processes));
    } catch (e) {
      console.error("Storage quota exceeded", e);
      setError("Aviso: O armazenamento local está cheio. Algumas faturas antigas podem não salvar corretamente.");
    }
  }, [processes]);

  // Reset category filter when changing process
  useEffect(() => {
    setSelectedCategory(null);
  }, [activeProcessId]);

  const activeProcess = processes.find(p => p.id === activeProcessId);

  const handleStartCreate = () => {
    const now = new Date();
    const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const formattedName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    setNewProcessName(formattedName);
    setIsCreatingProcess(true);
  };

  const handleResetData = () => {
    setShowResetConfirmation(true);
  };

  const confirmResetData = () => {
    localStorage.removeItem('invoice_app_data_v1');
    setProcesses([]);
    setActiveProcessId(null);
    setPersonA(DEFAULT_PEOPLE.PERSON_A);
    setPersonB(DEFAULT_PEOPLE.PERSON_B);
    setShowResetConfirmation(false);
  };

  const handleDeleteProcess = (id: string) => {
    setProcessToDeleteId(id);
  };

  const confirmDeleteProcess = () => {
    if (processToDeleteId) {
      setProcesses(prev => {
        // 1. Remove o processo que está sendo deletado
        const remainingProcesses = prev.filter(p => p.id !== processToDeleteId);

        // 2. CRUCIAL: Procura processos antigos que apontavam para este processo deletado
        // e reseta o link, liberando o saldo para ser importado novamente no futuro.
        return remainingProcesses.map(p => {
          if (p.carriedOverToProcessId === processToDeleteId) {
            // Remove o vínculo, tornando a dívida "pendente" novamente
            return { ...p, carriedOverToProcessId: null }; 
          }
          return p;
        });
      });
      
      setProcessToDeleteId(null);
      // Se o processo deletado era o ativo, volta para o histórico
      if (activeProcessId === processToDeleteId) {
        setActiveProcessId(null);
      }
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(processes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_financeiro_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = async (file: File) => {
    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);
      if (Array.isArray(parsedData)) {
        setProcesses(parsedData);
        alert('Backup restaurado com sucesso!');
      } else {
        setError("Arquivo inválido.");
      }
    } catch (e) {
      setError("Erro ao ler arquivo de backup.");
    }
  };

  // --- SUPABASE ACTIONS ---
  const handleSupabaseSave = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await saveBackupToSupabase(processes);
      alert('Histórico salvo na nuvem com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar na nuvem.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSupabaseLoad = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const data = await loadBackupFromSupabase();
      if (data && Array.isArray(data)) {
        setProcesses(data);
        alert('Dados baixados da nuvem e atualizados!');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao baixar da nuvem.');
    } finally {
      setIsSyncing(false);
    }
  };
  // ------------------------

  const confirmCreateProcess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProcessName.trim()) return;

    const newId = generateId();
    const newProcess: Process = {
      id: newId,
      name: newProcessName,
      createdAt: new Date().toISOString(),
      status: ProcessStatus.OPEN,
      transactions: [],
      invoices: []
    };

    let updatedProcesses = [newProcess, ...processes];
    
    // Check for CarryOver debts that are NOT linked to any process yet
    const pendingProcess = processes.find(p => 
      p.status === ProcessStatus.CLOSED && 
      p.closingBalance && 
      !p.carriedOverToProcessId // Only pick debts that are free
    );

    if (pendingProcess) {
       setPendingDebtProcess(pendingProcess);
       setProcesses(updatedProcesses);
       setActiveProcessId(newId);
       setIsCreatingProcess(false);
       return;
    }

    setProcesses(updatedProcesses);
    setActiveProcessId(newId);
    setIsCreatingProcess(false);
  };

  const handleImportPendingDebt = (shouldImport: boolean) => {
    if (!pendingDebtProcess || !activeProcessId) return;

    if (shouldImport && pendingDebtProcess.closingBalance) {
      const { debtor, amount } = pendingDebtProcess.closingBalance;
      const creditor = debtor === 'PERSON_A' ? 'PERSON_B' : 'PERSON_A';
      
      const debtTx: Transaction = {
        id: `carry-${Date.now()}`,
        description: `Saldo Anterior (${pendingDebtProcess.name})`,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        payer: creditor,
        assignment: debtor === 'PERSON_A' ? Assignment.PERSON_A : Assignment.PERSON_B, 
        source: 'CARRYOVER',
        category: 'Outros'
      };

      setProcesses(prev => prev.map(p => {
        if (p.id === activeProcessId) {
          return { ...p, transactions: [debtTx, ...p.transactions] };
        }
        if (p.id === pendingDebtProcess.id) {
          return { ...p, carriedOverToProcessId: activeProcessId };
        }
        return p;
      }));
    }

    setPendingDebtProcess(null);
  };

  const handleFileSelect = async (file: File, payer: PersonKey) => {
    if (!activeProcess) return;

    setIsProcessing(true);
    setError(null);
    try {
      const fileData = await fileToBase64(file);
      
      // Lógica de nomenclatura robusta para evitar duplicação
      const originalName = file.name;
      const extension = originalName.split('.').pop() || 'pdf';
      const nameWithoutExt = originalName.replace(`.${extension}`, '');
      // Sanitiza o nome removendo caracteres especiais para segurança
      const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '');
      const payerName = payer === 'PERSON_A' ? personA.name.toUpperCase() : personB.name.toUpperCase();
      const timestamp = Date.now().toString().slice(-6); // Últimos 6 digitos do timestamp
      
      // Ex: FaturaNubank_MARCO_837492.pdf
      const newFileName = `${safeName}_${payerName}_${timestamp}.${extension}`;

      const data = await parseInvoicePDF(file);
      const invoiceId = generateId();
      
      const sumOfTransactions = data.transactions.reduce((sum, t) => sum + t.amount, 0);
      const invoiceTotal = data.detectedTotal || sumOfTransactions;

      const newInvoice: InvoiceFile = {
        id: invoiceId,
        fileName: newFileName,
        originalName: originalName,
        payer,
        uploadDate: new Date().toISOString(),
        totalAmount: invoiceTotal,
        fileData: fileData
      };

      const newTransactions: Transaction[] = data.transactions.map((t, index) => ({
        ...t,
        id: `tx-${Date.now()}-${index}`,
        assignment: Assignment.SPLIT,
        payer,
        source: 'PDF',
        sourceInvoiceId: invoiceId
      }));

      setProcesses(prev => prev.map(p => {
        if (p.id === activeProcessId) {
          return {
            ...p,
            invoices: [...p.invoices, newInvoice],
            transactions: [...p.transactions, ...newTransactions]
          };
        }
        return p;
      }));

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualTransaction = (description: string, amount: number, date: string, payer: PersonKey, assignment: Assignment, category: string) => {
    if (!activeProcess) return;

    const newTx: Transaction = {
      id: `manual-${Date.now()}`,
      description,
      amount,
      date,
      payer,
      assignment,
      source: 'MANUAL',
      category
    };

    setProcesses(prev => prev.map(p => {
      if (p.id === activeProcessId) {
        return { ...p, transactions: [newTx, ...p.transactions] };
      }
      return p;
    }));
  };

  const handleUpdateAssignment = (id: string, assignment: Assignment) => {
    setProcesses(prev => prev.map(p => {
      if (p.id === activeProcessId) {
        return {
          ...p,
          transactions: p.transactions.map(tx => tx.id === id ? { ...tx, assignment } : tx)
        };
      }
      return p;
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    setProcesses(prev => prev.map(p => {
      if (p.id === activeProcessId) {
        const txToDelete = p.transactions.find(tx => tx.id === id);
        if (!txToDelete) return p;

        let updatedInvoices = p.invoices;
        if (txToDelete.sourceInvoiceId) {
          updatedInvoices = p.invoices.map(inv => {
            if (inv.id === txToDelete.sourceInvoiceId) {
              return { ...inv, totalAmount: Math.max(0, inv.totalAmount - txToDelete.amount) };
            }
            return inv;
          });
        }

        return {
          ...p,
          invoices: updatedInvoices,
          transactions: p.transactions.filter(tx => tx.id !== id)
        };
      }
      return p;
    }));
  };

  const handleCloseProcess = async (file: File) => {
     if (!activeProcess) return;
     
     try {
       const fileData = await fileToBase64(file);

       setProcesses(prev => prev.map(p => {
        if (p.id === activeProcessId) {
          return {
            ...p,
            status: ProcessStatus.CLOSED,
            closedAt: new Date().toISOString(),
            proofOfPayment: {
              fileName: file.name,
              date: new Date().toISOString(),
              fileData: fileData
            }
          };
        }
        return p;
      }));
      setShowProofModal(false);
      setActiveProcessId(null);
     } catch (e) {
       setError("Erro ao salvar comprovante.");
     }
  };

  const handleRequestCarryOver = (debtor: PersonKey, amount: number) => {
    setCarryOverData({ debtor, amount });
  };

  const confirmCarryOver = () => {
    if (!activeProcess || !carryOverData) return;

    setProcesses(prev => prev.map(p => {
      if (p.id === activeProcessId) {
        return {
          ...p,
          status: ProcessStatus.CLOSED,
          closedAt: new Date().toISOString(),
          closingBalance: {
            debtor: carryOverData.debtor,
            amount: carryOverData.amount
          }
        };
      }
      return p;
    }));
    setCarryOverData(null);
    setActiveProcessId(null);
  };

  const handleViewPdf = (base64Data: string, title: string) => {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Handler for chart click
  const handleCategoryClick = (categoryName: string) => {
    // Toggle: if clicked same category, clear filter. Else set it.
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveProcessId(null)}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hidden sm:block">
              Divisor de Faturas
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {activeProcess && (
               <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                 {activeProcess.name}
               </div>
             )}
             <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs text-white font-bold" title="Marco">M</div>
                <div className="w-8 h-8 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center text-xs text-white font-bold" title="Rita">R</div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        
        {/* Error Toast */}
        {error && (
          <div className="fixed top-20 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in shadow-lg max-w-md">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Aviso</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {!activeProcess ? (
          <HistoryView 
            processes={processes}
            onOpenProcess={(p) => setActiveProcessId(p.id)}
            onCreateNew={handleStartCreate}
            onResetData={handleResetData}
            onDeleteProcess={handleDeleteProcess}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onSupabaseSave={handleSupabaseSave}
            onSupabaseLoad={handleSupabaseLoad}
            isSyncing={isSyncing}
            personA={personA}
            personB={personB}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button 
              onClick={() => setActiveProcessId(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Histórico
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Input & List */}
              <div className="lg:col-span-2 space-y-6">
                
                {activeProcess.status === ProcessStatus.OPEN && (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h2 className="text-lg font-bold text-slate-800 mb-4">Adicionar Faturas</h2>
                      <UploadSection 
                        onFileSelect={handleFileSelect} 
                        isProcessing={isProcessing}
                        personA={personA}
                        personB={personB}
                        uploadedInvoices={activeProcess.invoices}
                        onViewPdf={handleViewPdf}
                      />
                    </div>

                    <ManualEntry 
                      personA={personA}
                      personB={personB}
                      onAddTransaction={handleManualTransaction}
                    />
                  </>
                )}

                {/* Se estiver fechado, mostrar faturas também */}
                {activeProcess.status === ProcessStatus.CLOSED && activeProcess.invoices.length > 0 && (
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h2 className="text-lg font-bold text-slate-800 mb-4">Faturas Processadas</h2>
                      <div className="divide-y divide-slate-200">
                        {activeProcess.invoices.map((invoice) => (
                          <div key={invoice.id} className="py-3 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${invoice.payer === 'PERSON_A' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{invoice.fileName}</p>
                                  <p className="text-xs text-slate-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.totalAmount)}</p>
                                </div>
                             </div>
                             <button
                                onClick={() => handleViewPdf(invoice.fileData, invoice.fileName)}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                              >
                                Ver PDF
                              </button>
                          </div>
                        ))}
                      </div>
                   </div>
                )}

                <TransactionTable 
                  transactions={activeProcess.transactions}
                  invoices={activeProcess.invoices}
                  onUpdateAssignment={handleUpdateAssignment}
                  onDeleteTransaction={handleDeleteTransaction}
                  personA={personA}
                  personB={personB}
                  readOnly={activeProcess.status === ProcessStatus.CLOSED}
                  selectedCategory={selectedCategory}
                  onClearCategory={() => setSelectedCategory(null)}
                />
              </div>

              {/* Right Column: Summary */}
              <div className="lg:col-span-1">
                <Summary 
                  transactions={activeProcess.transactions}
                  personA={personA}
                  personB={personB}
                  status={activeProcess.status}
                  onCloseProcess={() => setShowProofModal(true)}
                  onRequestCarryOver={handleRequestCarryOver}
                  proofFileName={activeProcess.proofOfPayment?.fileName}
                  closingBalance={activeProcess.closingBalance}
                  isCarriedOver={!!activeProcess.carriedOverToProcessId}
                  onViewProof={() => {
                    if (activeProcess.proofOfPayment?.fileData) {
                      handleViewPdf(activeProcess.proofOfPayment.fileData, activeProcess.proofOfPayment.fileName);
                    }
                  }}
                  onCategoryClick={handleCategoryClick}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New Process Modal */}
      {isCreatingProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Novo Mês</h3>
            <form onSubmit={confirmCreateProcess}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Período</label>
                <input 
                  type="text" 
                  autoFocus
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Dezembro 2024"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreatingProcess(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newProcessName.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carry Over Confirmation Modal */}
      {carryOverData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
               <div className="bg-orange-100 p-3 rounded-full">
                 <AlertTriangle className="w-6 h-6 text-orange-600" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-slate-900">Empurrar Saldo?</h3>
                 <p className="text-slate-500 text-sm mt-1">
                   Você está prestes a fechar o mês sem quitar a dívida agora.
                 </p>
               </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
               <p className="text-slate-800 text-center font-medium">
                  {carryOverData.debtor === 'PERSON_A' ? personA.name : personB.name} ficará devendo
                  <br/>
                  <span className="font-bold text-2xl text-slate-900 block my-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(carryOverData.amount)}
                  </span>
                  para o próximo mês.
               </p>
            </div>

            <p className="text-xs text-slate-500 mb-6 text-center">
              O status deste mês mudará para <strong>FECHADO (SALDO PENDENTE)</strong> e o valor será oferecido para importação quando você criar o próximo mês.
            </p>

            <div className="grid gap-3">
              <button 
                onClick={confirmCarryOver}
                className="w-full py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
              >
                Confirmar e Fechar Mês
              </button>
              <button 
                onClick={() => setCarryOverData(null)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Debt Import Modal (On New Month) */}
      {pendingDebtProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
             <div className="flex items-center justify-center mb-4">
               <div className="bg-indigo-100 p-4 rounded-full">
                 <Receipt className="w-8 h-8 text-indigo-600" />
               </div>
             </div>
             
             <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
               Saldo Encontrado
             </h3>
             
             <p className="text-slate-500 text-center text-sm mb-6">
               O processo <strong>"{pendingDebtProcess.name}"</strong> foi fechado com um saldo pendente de:
             </p>

             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingDebtProcess.closingBalance?.amount || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  A ser pago por {pendingDebtProcess.closingBalance?.debtor === 'PERSON_A' ? personA.name : personB.name}
                </p>
             </div>

             <p className="text-slate-500 text-center text-xs mb-6">
               Deseja importar essa dívida automaticamente para o novo mês <strong>"{newProcessName}"</strong>?
             </p>

             <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => handleImportPendingDebt(false)}
                 className="py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
               >
                 Ignorar
               </button>
               <button 
                 onClick={() => handleImportPendingDebt(true)}
                 className="py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
               >
                 Sim, Importar
               </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Proof of Payment Upload Modal (Close Process) */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Fechar Mês</h3>
              <button onClick={() => setShowProofModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-500 text-sm mb-6">
              Para finalizar este processo e garantir a auditoria, faça o upload do comprovante de transferência bancária (Pix/DOC).
            </p>

            <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer">
              <input 
                type="file" 
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleCloseProcess(e.target.files[0]);
                }}
              />
              <div className="flex flex-col items-center">
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-700">Clique para enviar o comprovante</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showResetConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Apagar Tudo?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Esta ação apagará <strong>todo o histórico</strong>, faturas e configurações do aplicativo neste dispositivo. <br/><br/>
              Dica: Faça um backup (download) antes se quiser guardar os dados.
            </p>
            <div className="grid gap-3">
              <button 
                onClick={confirmResetData}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Sim, Apagar Tudo
              </button>
              <button 
                onClick={() => setShowResetConfirmation(false)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Delete */}
      {processToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-slate-600 mb-4">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Excluir Mês?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Tem certeza que deseja apagar este mês e todas as faturas associadas? Esta ação não pode ser desfeita.
            </p>
            <div className="grid gap-3">
              <button 
                onClick={confirmDeleteProcess}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Sim, Excluir
              </button>
              <button 
                onClick={() => setProcessToDeleteId(null)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
