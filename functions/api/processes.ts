interface Env {
  DB: D1Database;
}

type ProcessRow = {
  id: string;
  name: string;
  status: "OPEN" | "CLOSED";
  created_at: string;
  closed_at: string | null;
};

type InvoiceRow = {
  process_id: string;
  id: string;
  file_name: string;
  original_name: string;
  payer: "PERSON_A" | "PERSON_B";
  upload_date: string;
  total_amount: number;
  file_data: string | null;
};

type TransactionRow = {
  process_id: string;
  id: string;
  date: string;
  description: string;
  amount: number;
  assignment: "PERSON_A" | "PERSON_B" | "SPLIT";
  payer: "PERSON_A" | "PERSON_B";
  source: "PDF" | "MANUAL" | "CARRYOVER";
  source_invoice_id: string | null;
  category: string | null;
};

type ProofRow = {
  process_id: string;
  file_name: string;
  date: string;
  file_data: string | null;
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

const mapProcess = (
  row: ProcessRow,
  transactionsByProcess: Record<string, TransactionRow[]>,
  invoicesByProcess: Record<string, InvoiceRow[]>,
  proofsByProcess: Record<string, ProofRow>,
) => ({
  id: row.id,
  name: row.name,
  status: row.status,
  createdAt: row.created_at,
  closedAt: row.closed_at ?? undefined,
  transactions: (transactionsByProcess[row.id] ?? []).map((tx) => ({
    id: tx.id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    assignment: tx.assignment,
    payer: tx.payer,
    source: tx.source,
    sourceInvoiceId: tx.source_invoice_id ?? undefined,
    category: tx.category ?? undefined,
  })),
  invoices: (invoicesByProcess[row.id] ?? []).map((invoice) => ({
    id: invoice.id,
    fileName: invoice.file_name,
    originalName: invoice.original_name,
    payer: invoice.payer,
    uploadDate: invoice.upload_date,
    totalAmount: invoice.total_amount,
    fileData: invoice.file_data ?? "",
  })),
  proofOfPayment: proofsByProcess[row.id]
    ? {
        fileName: proofsByProcess[row.id].file_name,
        date: proofsByProcess[row.id].date,
        fileData: proofsByProcess[row.id].file_data ?? "",
      }
    : undefined,
});

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [processesResult, invoicesResult, transactionsResult, proofsResult] = await Promise.all([
    env.DB.prepare(`
    SELECT
      id,
      name,
      status,
      created_at,
      closed_at
    FROM processes
    ORDER BY created_at DESC
  `).all<ProcessRow>(),
    env.DB.prepare(`
      SELECT process_id, id, file_name, original_name, payer, upload_date, total_amount, file_data
      FROM invoices
      ORDER BY upload_date ASC
    `).all<InvoiceRow>(),
    env.DB.prepare(`
      SELECT process_id, id, date, description, amount, assignment, payer, source, source_invoice_id, category
      FROM transactions
      ORDER BY date DESC, created_at DESC
    `).all<TransactionRow>(),
    env.DB.prepare(`
      SELECT process_id, file_name, date, file_data
      FROM proofs
    `).all<ProofRow>(),
  ]);

  const invoicesByProcess: Record<string, InvoiceRow[]> = {};
  const transactionsByProcess: Record<string, TransactionRow[]> = {};
  const proofsByProcess: Record<string, ProofRow> = {};

  for (const invoice of invoicesResult.results) {
    invoicesByProcess[invoice.process_id] ??= [];
    invoicesByProcess[invoice.process_id].push(invoice);
  }

  for (const tx of transactionsResult.results) {
    transactionsByProcess[tx.process_id] ??= [];
    transactionsByProcess[tx.process_id].push(tx);
  }

  for (const proof of proofsResult.results) {
    proofsByProcess[proof.process_id] = proof;
  }

  return jsonResponse({
    processes: processesResult.results.map((row) => mapProcess(row, transactionsByProcess, invoicesByProcess, proofsByProcess)),
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
