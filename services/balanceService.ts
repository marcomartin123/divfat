import { PersonKey, BalanceEntry } from "../types";

const parseJson = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("Content-Type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Erro ao acessar a API (${response.status}).`
    );
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Resposta inesperada da API (${response.status}).`);
  }

  return data as T;
};

export const listBalanceEntries = async (): Promise<BalanceEntry[]> => {
  const data = await parseJson<{ entries: BalanceEntry[] }>(await fetch("/api/balance-entries"));
  return data.entries;
};

export const createBalanceEntry = async (
  entry: Omit<BalanceEntry, 'id' | 'createdAt'>
): Promise<BalanceEntry> => {
  const data = await parseJson<{ entry: BalanceEntry }>(await fetch("/api/balance-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }));
  return data.entry;
};

export const deleteBalanceEntry = async (id: string): Promise<void> => {
  await parseJson<{ ok: boolean }>(await fetch(`/api/balance-entries/${id}`, {
    method: "DELETE",
  }));
};

export interface ExtratoLine {
  id: string;
  date: string;
  description: string;
  value: number;
  runningBalance: number;
}

export const getExtratoByPerson = (
  entries: BalanceEntry[],
  person: PersonKey
): ExtratoLine[] => {
  const personEntries = entries
    .filter(e => e.person === person)
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  let balance = 0;
  const withBalances = personEntries.map(e => {
    const signedAmount = e.type === 'DEBIT' ? -e.amount : e.amount;
    balance += signedAmount;
    return {
      id: e.id,
      date: e.entryDate,
      description: e.description,
      value: signedAmount,
      runningBalance: balance,
    };
  });

  return withBalances.reverse();
};

export const getPersonBalance = (
  entries: BalanceEntry[],
  person: PersonKey
): number => {
  return entries
    .filter(e => e.person === person)
    .reduce((acc, e) => {
      return acc + (e.type === 'DEBIT' ? -e.amount : e.amount);
    }, 0);
};

export const getBalanceSummary = (entries: BalanceEntry[]) => {
  const balanceA = getPersonBalance(entries, 'PERSON_A');
  const balanceB = getPersonBalance(entries, 'PERSON_B');

  const totalA = Math.abs(balanceA);
  const totalB = Math.abs(balanceB);

  if (totalA < 0.01 && totalB < 0.01) {
    return { debtor: null, creditor: null, amount: 0 };
  }

  if (balanceA < 0 && balanceB >= 0) {
    return { debtor: 'PERSON_A' as PersonKey, creditor: 'PERSON_B' as PersonKey, amount: totalA };
  }

  if (balanceB < 0 && balanceA >= 0) {
    return { debtor: 'PERSON_B' as PersonKey, creditor: 'PERSON_A' as PersonKey, amount: totalB };
  }

  if (balanceA < 0 && balanceB < 0) {
    const biggerDebtor = balanceA < balanceB ? 'PERSON_A' : 'PERSON_B';
    return {
      debtor: biggerDebtor as PersonKey,
      creditor: (biggerDebtor === 'PERSON_A' ? 'PERSON_B' : 'PERSON_A') as PersonKey,
      amount: Math.abs(balanceA - balanceB),
    };
  }

  const biggerCreditor = balanceA > balanceB ? 'PERSON_A' : 'PERSON_B';
  return {
    debtor: (biggerCreditor === 'PERSON_A' ? 'PERSON_B' : 'PERSON_A') as PersonKey,
    creditor: biggerCreditor as PersonKey,
    amount: Math.abs(balanceA - balanceB),
  };
};

export const calculateMonthBalance = (
  paidByA: number,
  paidByB: number,
  shareA: number,
  shareB: number
): { debtor: PersonKey | null; amount: number } => {
  const balanceA = paidByA - shareA;
  const balanceB = paidByB - shareB;

  const absBalance = Math.abs(balanceA);

  if (absBalance < 0.01) {
    return { debtor: null, amount: 0 };
  }

  if (balanceA < 0) {
    return { debtor: 'PERSON_A', amount: absBalance };
  }

  return { debtor: 'PERSON_B', amount: absBalance };
};
