
import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { TransactionTable } from './components/TransactionTable';
import { Summary } from './components/Summary';
import { ManualEntry } from './components/ManualEntry';
import { HistoryView } from './components/HistoryView';
import { BalanceStatement } from './components/BalanceStatement';
import { parseInvoicePDF } from './services/geminiService';
import { createProcess, deleteProcess, listProcesses, saveProcess } from './services/processService';
import { listBalanceEntries, createBalanceEntry, calculateMonthBalance } from './services/balanceService';
import { Transaction, Assignment, DEFAULT_PEOPLE, PersonProfile, Process, ProcessStatus, InvoiceFile, PersonKey, BalanceEntry } from './types';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  
  // New Process Modal State
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  
  // Balance Control State
  const [balanceEntries, setBalanceEntries] = useState<BalanceEntry[]>([]);
  const [showBalanceStatement, setShowBalanceStatement] = useState(false);

  // Deletion Modals State
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [processToDeleteId, setProcessToDeleteId] = useState<string | null>(null);

  // Settings
  const [personA, setPersonA] = useState<PersonProfile>(DEFAULT_PEOPLE.PERSON_A);
  const [personB, setPersonB] = useState<PersonProfile>(DEFAULT_PEOPLE.PERSON_B);

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [data, entries] = await Promise.all([
          listProcesses(),
          listBalanceEntries(),
        ]);
        setProcesses(data);
        setBalanceEntries(entries);
      } catch (e: any) {
        setError(e.message || "Erro ao carregar dados da nuvem.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Reset category filter when changing process
  useEffect(() => {
    setSelectedCategory(null);
  }, [activeProcessId]);

  const activeProcess = processes.find(p => p.id === activeProcessId);

  const persistProcess = async (process: Process) => {
    const saved = await saveProcess(process);
    setProcesses(prev => prev.map(p => p.id === saved.id ? saved : p));
    return saved;
  };

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

  const confirmResetData = async () => {
    try {
      await Promise.all(processes.map(p => deleteProcess(p.id)));
      setProcesses([]);
      setActiveProcessId(null);
      setPersonA(DEFAULT_PEOPLE.PERSON_A);
      setPersonB(DEFAULT_PEOPLE.PERSON_B);
      setShowResetConfirmation(false);
    } catch (e: any) {
      setError(e.message || "Erro ao apagar dados.");
    }
  };

  const handleDeleteProcess = (id: string) => {
    setProcessToDeleteId(id);
  };

  const confirmDeleteProcess = async () => {
    if (processToDeleteId) {
      try {
        await deleteProcess(processToDeleteId);
        setProcesses(prev => prev.filter(p => p.id !== processToDeleteId));
        setBalanceEntries(prev => prev.filter(e => e.processId !== processToDeleteId));
        setProcessToDeleteId(null);
        if (activeProcessId === processToDeleteId) {
          setActiveProcessId(null);
        }
      } catch (e: any) {
        setError(e.message || "Erro ao excluir mês.");
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
        const saved = await Promise.all((parsedData as Process[]).map(saveProcess));
        setProcesses(saved);
        alert('Backup restaurado com sucesso!');
      } else {
        setError("Arquivo inválido.");
      }
    } catch (e) {
      setError("Erro ao ler arquivo de backup.");
    }
  };

  const confirmCreateProcess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProcessName.trim()) return;

    try {
      const newProcess = await createProcess(newProcessName);
      setProcesses([newProcess, ...processes]);
      setActiveProcessId(newProcess.id);
      setIsCreatingProcess(false);
    } catch (err: any) {
      setError(err.message || "Erro ao criar mês.");
    }
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

      await persistProcess({
        ...activeProcess,
        invoices: [...activeProcess.invoices, newInvoice],
        transactions: [...activeProcess.transactions, ...newTransactions]
      });

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao processar o PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualTransaction = async (description: string, amount: number, date: string, payer: PersonKey, assignment: Assignment, category: string) => {
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

    try {
      await persistProcess({ ...activeProcess, transactions: [newTx, ...activeProcess.transactions] });
    } catch (e: any) {
      setError(e.message || "Erro ao adicionar item.");
    }
  };

  const handleUpdateAssignment = async (id: string, assignment: Assignment) => {
    if (!activeProcess) return;

    try {
      await persistProcess({
        ...activeProcess,
        transactions: activeProcess.transactions.map(tx => tx.id === id ? { ...tx, assignment } : tx)
      });
    } catch (e: any) {
      setError(e.message || "Erro ao atualizar item.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!activeProcess) return;

    const txToDelete = activeProcess.transactions.find(tx => tx.id === id);
    if (!txToDelete) return;

    let updatedInvoices = activeProcess.invoices;
    if (txToDelete.sourceInvoiceId) {
      updatedInvoices = activeProcess.invoices.map(inv => {
        if (inv.id === txToDelete.sourceInvoiceId) {
          return { ...inv, totalAmount: Math.max(0, inv.totalAmount - txToDelete.amount) };
        }
        return inv;
      });
    }

    try {
      await persistProcess({
        ...activeProcess,
        invoices: updatedInvoices,
        transactions: activeProcess.transactions.filter(tx => tx.id !== id)
      });
    } catch (e: any) {
      setError(e.message || "Erro ao excluir item.");
    }
  };

  const handleCloseProcess = async (file: File) => {
     if (!activeProcess) return;

     const total = activeProcess.transactions.reduce((s, t) => s + t.amount, 0);
     let paidByA = 0;
     let paidByB = 0;
     let shareA = 0;
     let shareB = 0;

     for (const tx of activeProcess.transactions) {
       if (tx.payer === 'PERSON_A') paidByA += tx.amount;
       else paidByB += tx.amount;

       if (tx.assignment === Assignment.PERSON_A) {
         shareA += tx.amount;
       } else if (tx.assignment === Assignment.PERSON_B) {
         shareB += tx.amount;
       } else {
         shareA += tx.amount / 2;
         shareB += tx.amount / 2;
       }
     }

     const { debtor, amount } = calculateMonthBalance(paidByA, paidByB, shareA, shareB);
     
     try {
        const fileData = await fileToBase64(file);

        const updatedProcess = await saveProcess({
          ...activeProcess,
          status: ProcessStatus.CLOSED,
          closedAt: new Date().toISOString(),
          proofOfPayment: {
            fileName: file.name,
            date: new Date().toISOString(),
            fileData: fileData
          }
        });
        setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));

        if (debtor && amount > 0.01) {
          const newEntry = await createBalanceEntry({
            person: debtor,
            processId: activeProcess.id,
            type: 'DEBIT',
            amount,
            description: `Fechamento ${activeProcess.name}`,
            entryDate: new Date().toISOString(),
          });
          setBalanceEntries(prev => [newEntry, ...prev]);
        }

       setShowProofModal(false);
       setActiveProcessId(null);
     } catch (e) {
       setError("Erro ao salvar comprovante.");
     }
  };

  const handleRegisterPayment = async (payment: { person: PersonKey; amount: number; description: string; entryDate: string }) => {
    try {
      const newEntry = await createBalanceEntry({
        person: payment.person,
        type: 'CREDIT',
        amount: payment.amount,
        description: payment.description,
        entryDate: payment.entryDate,
      });
      setBalanceEntries(prev => [newEntry, ...prev]);
    } catch (e: any) {
      setError(e.message || "Erro ao registrar pagamento.");
    }
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

        {!activeProcess && showBalanceStatement ? (
          <BalanceStatement
            entries={balanceEntries}
            personA={personA}
            personB={personB}
            onBack={() => setShowBalanceStatement(false)}
            onRegisterPayment={handleRegisterPayment}
          />
        ) : !activeProcess && !showBalanceStatement ? (
          <HistoryView 
            processes={processes}
            onOpenProcess={(p) => setActiveProcessId(p.id)}
            onCreateNew={handleStartCreate}
            onResetData={handleResetData}
            onDeleteProcess={handleDeleteProcess}
            onExportData={handleExportData}
            onImportData={handleImportData}
            personA={personA}
            personB={personB}
            balanceEntries={balanceEntries}
            onViewBalanceStatement={() => setShowBalanceStatement(true)}
            onRegisterPayment={handleRegisterPayment}
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
                  proofFileName={activeProcess.proofOfPayment?.fileName}
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
