
import React, { useState } from 'react';
import { PersonProfile, PersonKey, Assignment } from '../types';
import { Plus, Zap } from 'lucide-react';

interface ManualEntryProps {
  personA: PersonProfile;
  personB: PersonProfile;
  onAddTransaction: (description: string, amount: number, date: string, payer: PersonKey, assignment: Assignment, category: string) => void;
}

const CATEGORIES = [
  'Supermercado', 'Restaurante', 'Transporte', 'Serviços Digitais', 
  'Viagem', 'Saúde', 'Educação', 'Lazer', 'Serviços', 
  'Financeiro', 'Outros'
];

export const ManualEntry: React.FC<ManualEntryProps> = ({ personA, personB, onAddTransaction }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payer, setPayer] = useState<PersonKey>('PERSON_A'); // Default payer
  const [assignment, setAssignment] = useState<Assignment>(Assignment.SPLIT);
  const [category, setCategory] = useState('Outros');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    
    onAddTransaction(description, parseFloat(amount), date, payer, assignment, category);
    setDescription('');
    setAmount('');
    setCategory('Outros');
  };

  const addPreset = (name: string, defaultAmount: number, defaultAssignment: Assignment, presetCategory: string) => {
    onAddTransaction(name, defaultAmount, date, payer, defaultAssignment, presetCategory);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800">Adicionar Item Manual</h3>
      </div>

      {/* Presets */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => addPreset('Escola', 1500, Assignment.SPLIT, 'Educação')}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100"
        >
          <Zap className="w-3 h-3" />
          Escola (R$ 1.500)
        </button>
        <button 
          onClick={() => addPreset('Aluguel', 2000, Assignment.SPLIT, 'Outros')}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100"
        >
          <Zap className="w-3 h-3" />
          Aluguel (R$ 2.000)
        </button>
        <button 
          onClick={() => addPreset('Internet', 150, Assignment.SPLIT, 'Serviços')}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100"
        >
          <Zap className="w-3 h-3" />
          Internet
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Linha 1: Dados Básicos */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
            <input 
              type="text" 
              placeholder="Ex: Jantar"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Valor</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Linha 2: Classificação e Ação */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
             <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
             <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
             >
               {CATEGORIES.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">Quem Pagou?</label>
            <select 
              value={payer}
              onChange={(e) => setPayer(e.target.value as PersonKey)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PERSON_A">{personA.name}</option>
              <option value="PERSON_B">{personB.name}</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">P/ Quem?</label>
            <select 
              value={assignment}
              onChange={(e) => setAssignment(e.target.value as Assignment)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={Assignment.SPLIT}>Dividir (50/50)</option>
              <option value={Assignment.PERSON_A}>Só {personA.name}</option>
              <option value={Assignment.PERSON_B}>Só {personB.name}</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <button 
              type="submit"
              className="w-full h-[38px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-sm"
              title="Adicionar Lançamento"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
