interface Env {
  DB: D1Database;
}

type ProcessRow = {
  id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  created_at: string;
  closed_at: string | null;
  closing_debtor: "PERSON_A" | "PERSON_B" | null;
  closing_amount: number | null;
  carried_over_to_process_id: string | null;
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const mapProcess = (row: ProcessRow) => ({
  id: row.id,
  name: row.name,
  status: row.status,
  createdAt: row.created_at,
  closedAt: row.closed_at ?? undefined,
  closingBalance: row.closing_debtor && row.closing_amount != null
    ? {
        debtor: row.closing_debtor,
        amount: row.closing_amount,
      }
    : undefined,
  carriedOverToProcessId: row.carried_over_to_process_id,
  transactions: [],
  invoices: [],
});

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = await env.DB.prepare(`
    SELECT
      id,
      name,
      status,
      created_at,
      closed_at,
      closing_debtor,
      closing_amount,
      carried_over_to_process_id
    FROM processes
    ORDER BY created_at DESC
  `).all<ProcessRow>();

  return jsonResponse({
    processes: result.results.map(mapProcess),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ name?: string }>().catch(() => null);
  const name = body?.name?.trim();

  if (!name) {
    return jsonResponse({ error: "Process name is required." }, 400);
  }

  const process = {
    id: generateId(),
    name,
    status: "OPEN" as const,
    createdAt: new Date().toISOString(),
    transactions: [],
    invoices: [],
  };

  await env.DB.prepare(`
    INSERT INTO processes (id, name, status, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(process.id, process.name, process.status, process.createdAt).run();

  return jsonResponse({ process }, 201);
};

export const onRequest: PagesFunction<Env> = async () => {
  return jsonResponse({ error: "Method not allowed." }, 405);
};
