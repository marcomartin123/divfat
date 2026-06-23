import React, { useState } from 'react';
import { BalanceEntry, PersonProfile, PersonKey } from '../types';
import { getExtratoByPerson, getPersonBalance } from '../services/balanceService';
import { ChevronLeft, Plus, DollarSign, X } from 'lucide-react';

interface BalanceStatementProps {
  entries: BalanceEntry[];
  personA: PersonProfile;
  personB: PersonProfile;
  onBack: () => void;
  onRegisterPayment: (payment: { person: PersonKey; amount: number; description: string; entryDate: string }) => void;
}

export const BalanceStatement: React.FC<BalanceStatementProps> = ({
  entries,
  personA,
  personB,
  onBack,
  onRegisterPayment,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPerson, setPaymentPerson] = useState<PersonKey>('PERSON_A');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDescription, setPaymentDescription] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const extratoA = getExtratoByPerson(entries, 'PERSON_A');
  const extratoB = getExtratoByPerson(entries, 'PERSON_B');
  const balanceA = getPersonBalance(entries, 'PERSON_A');
  const balanceB = getPersonBalance(entries, 'PERSON_B');

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(paymentAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    onRegisterPayment({
      person: paymentPerson,
      amount,
      description: paymentDescription.trim() || 'Pagamento',
      entryDate: new Date(paymentDate).toISOString(),
    });

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentDescription('');
  };

  const renderExtrato = (person: PersonKey, extrato: ReturnType<typeof getExtratoByPerson>, balance: number) => {
    const profile = person === 'PERSON_A' ? personA : personB;
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">{profile.name}</h3>
          {balance < -0.01 && (
            <span className="text-sm font-semibold text-red-600">
              Deve {formatCurrency(Math.abs(balance))}
            </span>
          )}
          {balance > 0.01 && (
            <span className="text-sm font-semibold text-green-600">
              Saldo positivo: {formatCurrency(balance)}
            </span>
          )}
        </div>
        
        {extrato.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nenhum saldo pendente.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-3">Data</div>
              <div className="col-span-5">Descrição</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Saldo</div>
            </div>
            <div className="divide-y divide-slate-100">
              {extrato.map((line) => (
                <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-1 p-3 text-sm hover:bg-slate-50">
                  <div className="md:col-span-3 text-slate-500 text-xs md:text-sm">
                    {formatDate(line.date)}
                  </div>
                  <div className="md:col-span-5 font-medium text-slate-900 truncate">
                    {line.description}
                  </div>
                  <div className={`md:col-span-2 text-right font-medium ${line.value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(line.value)}
                  </div>
                  <div className={`md:col-span-2 text-right font-medium ${line.runningBalance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatCurrency(line.runningBalance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-md shadow-indigo-200 active:scale-95 text-sm"
        >
          <DollarSign className="w-4 h-4" />
          Registrar Pagamento
        </button>
      </div>

      <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Controle de Saldos</h2>
        {(balanceA < -0.01 || balanceB < -0.01) && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-sm text-orange-900 font-medium">
              <span className="font-bold">{balanceA < balanceB ? personA.name : personB.name}</span> deve{' '}
              <span className="font-bold">
                {formatCurrency(Math.abs(balanceA < balanceB ? balanceA : balanceB))}
              </span>{' '}
              para{' '}
              <span className="font-bold">{balanceA > balanceB ? personA.name : personB.name}</span>
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        {renderExtrato('PERSON_A', extratoA, balanceA)}
        <div className="border-t border-slate-200 my-6"></div>
        {renderExtrato('PERSON_B', extratoB, balanceB)}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Registrar Pagamento</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quem pagou?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPerson('PERSON_A')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      paymentPerson === 'PERSON_A'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {personA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPerson('PERSON_B')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      paymentPerson === 'PERSON_B'
                        ? 'bg-pink-100 text-pink-700 border-pink-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {personB.name}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Pagamento Pix"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!paymentAmount || Number.parseFloat(paymentAmount) <= 0}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
