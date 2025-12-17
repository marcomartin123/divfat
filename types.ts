
export enum Assignment {
  PERSON_A = 'PERSON_A',
  PERSON_B = 'PERSON_B',
  SPLIT = 'SPLIT', // 50/50
}

export type PersonKey = 'PERSON_A' | 'PERSON_B';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  assignment: Assignment;
  payer: PersonKey; // Quem desembolsou o dinheiro
  source: 'PDF' | 'MANUAL' | 'CARRYOVER';
  sourceInvoiceId?: string; // Se veio de um PDF
  category?: string; // Nova categoria (Alimentação, Lazer, etc)
}

export interface ExtractedData {
  invoiceDate?: string;
  detectedTotal?: number; // Total explicitamente encontrado no documento pela IA
  transactions: Omit<Transaction, 'id' | 'assignment' | 'payer' | 'source'>[];
}

export interface PersonProfile {
  id: PersonKey;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const DEFAULT_PEOPLE: Record<PersonKey, PersonProfile> = {
  PERSON_A: {
    id: 'PERSON_A',
    name: 'Marco',
    color: '#3b82f6', // blue-500
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200'
  },
  PERSON_B: {
    id: 'PERSON_B',
    name: 'Rita',
    color: '#ec4899', // pink-500
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-200'
  },
};

export enum ProcessStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface InvoiceFile {
  id: string;
  fileName: string; // Nome renomeado (ex: fatura_MARCO.pdf)
  originalName: string; // Nome original para referência
  payer: PersonKey;
  uploadDate: string;
  totalAmount: number; // Valor total somado das transações dessa fatura
  fileData: string; // Base64 do PDF para download/visualização
}

export interface Process {
  id: string;
  name: string; // Ex: "Outubro 2023"
  createdAt: string;
  closedAt?: string;
  status: ProcessStatus;
  transactions: Transaction[];
  invoices: InvoiceFile[];
  proofOfPayment?: {
    fileName: string;
    date: string;
    fileData: string; // Base64 do comprovante
  };
  // Novos campos para controle de saldo "empurrado"
  closingBalance?: {
    debtor: PersonKey;
    amount: number;
  };
  carriedOverToProcessId?: string | null; // ID do processo futuro que absorveu essa dívida
}
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
