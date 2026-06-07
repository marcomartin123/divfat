import { Process } from "../types";

const parseJson = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erro ao acessar a API.");
  }
  return data as T;
};

export const listProcesses = async (): Promise<Process[]> => {
  const data = await parseJson<{ processes: Process[] }>(await fetch("/api/processes"));
  return data.processes;
};

export const createProcess = async (name: string): Promise<Process> => {
  const data = await parseJson<{ process: Process }>(await fetch("/api/processes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  }));

  return data.process;
};

export const saveProcess = async (process: Process): Promise<Process> => {
  const data = await parseJson<{ process: Process }>(await fetch(`/api/processes/${process.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(process),
  }));

  return data.process;
};

export const deleteProcess = async (id: string): Promise<void> => {
  await parseJson<{ ok: boolean }>(await fetch(`/api/processes/${id}`, {
    method: "DELETE",
  }));
};
