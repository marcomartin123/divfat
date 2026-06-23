import { PersonKey, Process } from "../types";

export interface PendingBalance {
  process: Process;
  debtor: PersonKey;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
}

export const getRemainingBalance = (process: Process) => {
  if (!process.closingBalance) return 0;

  const settledAmount = process.closingBalance.settledAmount ?? 0;
  return Math.max(0, process.closingBalance.amount - settledAmount);
};

export const getPendingBalances = (processes: Process[]): PendingBalance[] =>
  processes
    .filter((process) => process.closingBalance)
    .map((process) => {
      const settledAmount = process.closingBalance?.settledAmount ?? 0;
      const amount = process.closingBalance?.amount ?? 0;

      return {
        process,
        debtor: process.closingBalance!.debtor,
        amount,
        settledAmount,
        remainingAmount: Math.max(0, amount - settledAmount),
      };
    })
    .filter((balance) => balance.remainingAmount > 0.009)
    .sort((a, b) => new Date(a.process.closedAt ?? a.process.createdAt).getTime() - new Date(b.process.closedAt ?? b.process.createdAt).getTime());

export const getPendingNet = (pendingBalances: PendingBalance[]) =>
  pendingBalances.reduce((netPersonAOwes, balance) => {
    if (balance.debtor === "PERSON_A") {
      return netPersonAOwes + balance.remainingAmount;
    }

    return netPersonAOwes - balance.remainingAmount;
  }, 0);
