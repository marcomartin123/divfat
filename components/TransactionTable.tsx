import React, { useState } from 'react';
import { Transaction, Assignment, PersonProfile, InvoiceFile, PersonKey } from '../types';
import { Users, User, Trash2, FileText, HandCoins, History, Search, Filter, X } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  invoices: InvoiceFile[];
  onUpdateAssignment: (id: string, assignment: Assignment) => void;
  onDeleteTransaction: (id: string) => void;
  personA: PersonProfile;
  personB: PersonProfile;
  readOnly?: boolean;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  invoices,
  onUpdateAssignment,
  onDeleteTransaction,
  personA,
  personB,
  readOnly = false,
  selectedCategory,
  onClearCategory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayer, setFilterPayer] = useState<'ALL' | PersonKey>('ALL');
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}`;
    } catch {
      return dateString;
    }
  };

  const getSourceLabel = (tx: Transaction) => {
    if (tx.source === 'MANUAL') return 'Manual';
    if (tx.source === 'CARRYOVER') return 'Mês Anterior';
    const invoice = invoices.find(inv => inv.id === tx.sourceInvoiceId);
    return invoice ? invoice.fileName : 'PDF';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'MANUAL': return <HandCoins className="w-3 h-3"/>;
      case 'CARRYOVER': return <History className="w-3 h-3"/>;
      default: return <FileText className="w-3 h-3"/>;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    // Filtro por Pagador
    if (filterPayer !== 'ALL' && tx.payer !== filterPayer) return false;

    // Filtro por Categoria (vindo do gráfico)
    if (selectedCategory) {
      // Se a categoria selecionada for "Outros", o gráfico agrupou várias coisas.
      // Mas aqui vamos fazer um match exato por enquanto para simplificar e ser robusto.
      // A IA normaliza as categorias, então deve bater.
      // Obs: Se o gráfico agrupou itens pequenos em "Outros", clicar em "Outros" só mostrará itens que REALMENTE são "Outros" na origem.
      const txCat = tx.category || 'Outros';
      if (txCat !== selectedCategory && selectedCategory !== 'Outros') return false;
      if (selectedCategory === 'Outros' && tx.category && tx.category !== 'Outros') return false; // Se clicou Outros, mostra só Outros/null
    }

    // Busca por Texto
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.description.toLowerCase().includes(term) ||
      tx.amount.toString().includes(term) ||
      tx.date.includes(term)
    );
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Itens para Divisão</h2>
          <p className="text-slate-500 text-xs">{filteredTransactions.length} itens listados</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Filtro de Pessoa */}
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
             <button
               onClick={() => setFilterPayer('ALL')}
               className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                 filterPayer === 'ALL' ? 'bg-slate-100 text-slate-700 font-bold' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               Todos
             </button>
             <button
               onClick={() => setFilterPayer('PERSON_A')}
               className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                 filterPayer === 'PERSON_A' ? `${personA.bgClass} ${personA.textClass} shadow-sm border ${personA.borderClass}` : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               <div className="w-2 h-2 rounded-full" style={{backgroundColor: personA.color}}></div>
               {personA.name}
             </button>
             <button
               onClick={() => setFilterPayer('PERSON_B')}
               className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                 filterPayer === 'PERSON_B' ? `${personB.bgClass} ${personB.textClass} shadow-sm border ${personB.borderClass}` : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               <div className="w-2 h-2 rounded-full" style={{backgroundColor: personB.color}}></div>
               {personB.name}
             </button>
          </div>

          {/* Busca */}
          <div className="relative w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>
      </div>
      
      {/* Active Category Filter Badge */}
      {selectedCategory && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
             <Filter className="w-4 h-4" />
             Filtrando por Categoria: <span className="font-bold">{selectedCategory}</span>
           </div>
           {onClearCategory && (
             <button onClick={onClearCategory} className="text-indigo-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-100 transition-colors">
               <X className="w-4 h-4" />
             </button>
           )}
        </div>
      )}

      {/* Table Header (Desktop) */}
      <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
        <div className="col-span-2">Data/Origem</div>
        <div className="col-span-4">Descrição</div>
        <div className="col-span-2">Quem Pagou</div>
        <div className="col-span-2 text-right">Valor</div>
        <div className="col-span-2 text-center">Para Quem?</div>
      </div>

      {/* Transactions List - Full Page Scroll */}
      <div className="w-full">
        {sortedTransactions.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            {searchTerm || filterPayer !== 'ALL' || selectedCategory ? 'Nenhum item encontrado com este filtro.' : 'Nenhuma transação registrada.'}
          </div>
        ) : (
          sortedTransactions.map((tx) => (
            <div 
              key={tx.id} 
              className={`group grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border-b border-slate-100 hover:bg-slate-50 items-center transition-colors text-sm ${readOnly ? 'opacity-90' : ''} ${tx.source === 'CARRYOVER' ? 'bg-orange-50/50' : ''}`}
            >
              {/* Date & Source */}
              <div className="col-span-1 md:col-span-2 flex flex-col">
                <span className="font-medium text-slate-600">{formatDate(tx.date)}</span>
                <span className={`text-[10px] flex items-center gap-1 truncate ${tx.source === 'CARRYOVER' ? 'text-orange-600 font-bold' : 'text-slate-400'}`} title={getSourceLabel(tx)}>
                   {getSourceIcon(tx.source)}
                   {getSourceLabel(tx)}
                </span>
                {tx.category && <span className="text-[10px] text-indigo-400 mt-0.5 md:hidden">{tx.category}</span>}
              </div>
              
              <div className="col-span-1 md:col-span-4">
                <p className="font-medium text-slate-900 truncate" title={tx.description}>
                  {tx.description}
                </p>
                {/* Desktop Category Label */}
                {tx.category && <span className="hidden md:inline-block text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1">{tx.category}</span>}
              </div>

              <div className="col-span-1 md:col-span-2">
                 <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                   tx.payer === 'PERSON_A' ? `${personA.bgClass} ${personA.textClass} ${personA.borderClass}` : `${personB.bgClass} ${personB.textClass} ${personB.borderClass}`
                 }`}>
                    {tx.payer === 'PERSON_A' ? personA.name : personB.name}
                 </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-between md:block md:text-right">
                <span className="md:hidden text-slate-500">Valor:</span>
                <span className={`font-bold ${tx.amount < 0 ? 'text-green-600' : 'text-slate-900'}`}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>

              {/* Controls */}
              <div className="col-span-1 md:col-span-2 flex justify-center items-center gap-2">
                {!readOnly && tx.source !== 'CARRYOVER' ? (
                  <>
                  <div className="inline-flex bg-slate-100 p-0.5 rounded-lg shadow-sm">
                    <button
                      onClick={() => onUpdateAssignment(tx.id, Assignment.PERSON_A)}
                      className={`p-1.5 rounded-md transition-all ${
                        tx.assignment === Assignment.PERSON_A 
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={`É gasto d@ ${personA.name}`}
                    >
                      <User className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateAssignment(tx.id, Assignment.SPLIT)}
                      className={`p-1.5 rounded-md transition-all ${
                        tx.assignment === Assignment.SPLIT 
                          ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Dividir 50/50"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateAssignment(tx.id, Assignment.PERSON_B)}
                      className={`p-1.5 rounded-md transition-all ${
                        tx.assignment === Assignment.PERSON_B 
                          ? 'bg-white text-pink-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={`É gasto d@ ${personB.name}`}
                    >
                      <User className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir item (atualiza o total da fatura)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </>
                ) : (
                  <span className={`text-xs font-medium ${
                    tx.assignment === Assignment.SPLIT ? 'text-purple-600' : 
                    tx.assignment === Assignment.PERSON_A ? personA.textClass : personB.textClass
                  }`}>
                    {tx.assignment === Assignment.SPLIT ? 'DIVIDIDO' : 
                     tx.assignment === Assignment.PERSON_A ? personA.name.toUpperCase() : personB.name.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};