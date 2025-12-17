import React, { useMemo } from 'react';
import { Transaction, Assignment, PersonProfile, ProcessStatus, PersonKey } from '../types';
import { Download, CheckCircle, AlertTriangle, FileText, ArrowRightCircle, History, Eye } from 'lucide-react';
import { CategoryChart } from './CategoryChart';

interface SummaryProps {
  transactions: Transaction[];
  personA: PersonProfile;
  personB: PersonProfile;
  status: ProcessStatus;
  onCloseProcess?: () => void;
  onRequestCarryOver?: (debtor: PersonKey, amount: number) => void;
  proofFileName?: string;
  closingBalance?: { debtor: PersonKey, amount: number };
  isCarriedOver?: boolean;
  onViewProof?: () => void;
  onCategoryClick?: (category: string) => void;
}

export const Summary: React.FC<SummaryProps> = ({ 
  transactions, 
  personA, 
  personB, 
  status, 
  onCloseProcess, 
  onRequestCarryOver,
  proofFileName,
  closingBalance,
  isCarriedOver,
  onViewProof,
  onCategoryClick
}) => {
  
  const stats = useMemo(() => {
    let total = 0;
    
    // Total Paid by each
    let paidByA = 0;
    let paidByB = 0;

    // "Fair Share" / Consumption
    let shareA = 0;
    let shareB = 0;

    transactions.forEach(tx => {
      // amount can be negative (credits). Adding a negative amount reduces total correctly.
      total += tx.amount;
      
      // Who paid? (Who is on the invoice/card)
      // If it's a credit (-100) on A's card, A "paid" -100 (received 100).
      if (tx.payer === 'PERSON_A') paidByA += tx.amount;
      else paidByB += tx.amount;

      // Who consumed?
      // If it's a credit for a shared item (SPLIT), both get -50 share.
      if (tx.assignment === Assignment.PERSON_A) {
        shareA += tx.amount;
      } else if (tx.assignment === Assignment.PERSON_B) {
        shareB += tx.amount;
      } else {
        // Split
        shareA += tx.amount / 2;
        shareB += tx.amount / 2;
      }
    });

    // Net Balance calculation
    // If (Paid - Share) > 0, they are OWED money.
    // If (Paid - Share) < 0, they OWE money.
    const balanceA = paidByA - shareA;
    const balanceB = paidByB - shareB;

    return { total, paidByA, paidByB, shareA, shareB, balanceA, balanceB };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const downloadReport = () => {
    const headers = ['Data', 'Descricao', 'Categoria', 'Origem', 'Quem Pagou', 'Para Quem', 'Valor', `Parte ${personA.name}`, `Parte ${personB.name}`];
    
    const rows = transactions.map(tx => {
      const payerName = tx.payer === 'PERSON_A' ? personA.name : personB.name;
      let assignName = 'Dividido';
      let valA = 0;
      let valB = 0;

      if (tx.assignment === Assignment.PERSON_A) {
        assignName = personA.name;
        valA = tx.amount;
      } else if (tx.assignment === Assignment.PERSON_B) {
        assignName = personB.name;
        valB = tx.amount;
      } else {
        valA = tx.amount / 2;
        valB = tx.amount / 2;
      }

      return [
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.category || 'Outros',
        tx.source === 'MANUAL' ? 'Manual' : (tx.source === 'CARRYOVER' ? 'Saldo Anterior' : 'Fatura PDF'),
        payerName,
        assignName,
        tx.amount.toFixed(2),
        valA.toFixed(2),
        valB.toFixed(2)
      ].join(',');
    });

    const summaryRows = [
      `\n\nRESUMO FINANCEIRO`,
      `Total Gasto,${stats.total.toFixed(2)}`,
      `Pago por ${personA.name},${stats.paidByA.toFixed(2)}`,
      `Pago por ${personB.name},${stats.paidByB.toFixed(2)}`,
      `Parte Justa ${personA.name},${stats.shareA.toFixed(2)}`,
      `Parte Justa ${personB.name},${stats.shareB.toFixed(2)}`,
      `AJUSTE FINAL:`,
      `${personA.name} ${stats.balanceA >= 0 ? 'RECEBE' : 'PAGA'},${Math.abs(stats.balanceA).toFixed(2)}`,
      `${personB.name} ${stats.balanceB >= 0 ? 'RECEBE' : 'PAGA'},${Math.abs(stats.balanceB).toFixed(2)}`
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n') + summaryRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_fatura_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const debtor = stats.balanceA < 0 ? personA : personB;
  const creditor = stats.balanceA > 0 ? personA : personB;
  const settlementAmount = Math.abs(stats.balanceA);
  const isSettled = Math.abs(stats.balanceA) < 0.01; // Floating point tolerance

  // Handling CarryOver Logic
  const handleCarryOverClick = () => {
    if (onRequestCarryOver && !isSettled) {
      // If balanceA is negative, A is debtor. If positive, B is debtor (since balanceB would be negative).
      const debtorKey: PersonKey = stats.balanceA < 0 ? 'PERSON_A' : 'PERSON_B';
      onRequestCarryOver(debtorKey, settlementAmount);
    }
  };

  return (
    <div className="flex flex-col gap-6 sticky top-24 h-full">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold text-slate-800">Resumo Executivo</h2>
          {status === ProcessStatus.CLOSED && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${proofFileName ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {proofFileName ? <CheckCircle className="w-3 h-3" /> : <History className="w-3 h-3" />}
              {proofFileName ? 'FECHADO' : 'SALDO PENDENTE'}
            </span>
          )}
        </div>

        <div className="space-y-6 flex-1">
          {/* Total Box */}
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-slate-500 text-sm mb-1">Total do Mês</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.total)}</p>
          </div>

          {/* Contributions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500">Pago por {personA.name}</p>
              <p className={`font-semibold ${personA.textClass}`}>{formatCurrency(stats.paidByA)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500">Pago por {personB.name}</p>
              <p className={`font-semibold ${personB.textClass}`}>{formatCurrency(stats.paidByB)}</p>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full my-4"></div>

          {/* Settlement Logic */}
          {!isSettled ? (
            <div className={`p-5 rounded-xl border-l-4 ${debtor.borderClass.replace('border-', 'border-l-')} bg-slate-50 shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-slate-400" />
                <p className="text-sm font-bold text-slate-700 uppercase">Acerto de Contas</p>
              </div>
              <p className="text-lg text-slate-800 leading-snug">
                <span className={`font-bold ${debtor.textClass}`}>{debtor.name}</span> deve pagar <br/>
                <span className="text-2xl font-bold text-slate-900">{formatCurrency(settlementAmount)}</span> <br/>
                para <span className={`font-bold ${creditor.textClass}`}>{creditor.name}</span>
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-green-50 border border-green-100 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-bold">Contas Ajustadas!</p>
              <p className="text-green-600 text-sm">Ninguém deve nada a ninguém.</p>
            </div>
          )}

          {/* Proof / History Logic */}
          {status === ProcessStatus.CLOSED && (
            <div className="mt-4 space-y-2">
              {proofFileName ? (
                <div 
                  className="p-3 bg-slate-100 rounded-lg text-xs text-slate-500 flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors"
                  onClick={onViewProof}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Comprovante: {proofFileName}</span>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400" />
                </div>
              ) : closingBalance ? (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-700">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <ArrowRightCircle className="w-4 h-4" />
                    <span>Saldo Transferido</span>
                  </div>
                  {isCarriedOver ? (
                    <span>Já incluído no próximo mês.</span>
                  ) : (
                    <span>Aguardando abertura de novo mês para importação.</span>
                  )}
                </div>
              ) : null}
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button 
            onClick={downloadReport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Relatório (CSV)</span>
          </button>

          {status === ProcessStatus.OPEN && (
            <>
              {onCloseProcess && (
                <button 
                  onClick={onCloseProcess}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Fechar Mês (Upload Comprovante)</span>
                </button>
              )}
              
              {!isSettled && onRequestCarryOver && (
                <button 
                  onClick={handleCarryOverClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-800 border border-orange-200 rounded-xl font-medium hover:bg-orange-200 transition-colors"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>Fechar e Empurrar Saldo</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Category Chart */}
      <CategoryChart transactions={transactions} onCategoryClick={onCategoryClick} />
    </div>
  );
};