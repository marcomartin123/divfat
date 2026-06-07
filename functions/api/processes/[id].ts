interface Env {
  DB: D1Database;
}

type PersonKey = "PERSON_A" | "PERSON_B";
type ProcessStatus = "OPEN" | "CLOSED";

type ProcessPayload = {
  id: string;
  name: string;
  createdAt: string;
  closedAt?: string;
  status: ProcessStatus;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    assignment: "PERSON_A" | "PERSON_B" | "SPLIT";
    payer: PersonKey;
    source: "PDF" | "MANUAL" | "CARRYOVER";
    sourceInvoiceId?: string;
    category?: string;
  }>;
  invoices: Array<{
    id: string;
    fileName: string;
    originalName: string;
    payer: PersonKey;
    uploadDate: string;
    totalAmount: number;
    fileData: string;
  }>;
  proofOfPayment?: {
    fileName: string;
    date: string;
    fileData: string;
  };
  closingBalance?: {
    debtor: PersonKey;
    amount: number;
  };
  carriedOverToProcessId?: string | null;
};

type ProcessRow = {
  id: string;
  name: string;
  status: ProcessStatus;
  created_at: string;
  closed_at: string | null;
  closing_debtor: PersonKey | null;
  closing_amount: number | null;
  carried_over_to_process_id: string | null;
};

type InvoiceRow = {
  id: string;
  file_name: string;
  original_name: string;
  payer: PersonKey;
  upload_date: string;
  total_amount: number;
  file_data: string | null;
};

type TransactionRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  assignment: "PERSON_A" | "PERSON_B" | "SPLIT";
  payer: PersonKey;
  source: "PDF" | "MANUAL" | "CARRYOVER";
  source_invoice_id: string | null;
  category: string | null;
};

type ProofRow = {
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

const getId = (params: Record<string, string | string[]>) => {
  const id = params.id;
  return Array.isArray(id) ? id[0] : id;
};

const loadProcess = async (db: D1Database, id: string) => {
  const process = await db.prepare(`
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
    WHERE id = ?
  `).bind(id).first<ProcessRow>();

  if (!process) {
    return null;
  }

  const [invoicesResult, transactionsResult, proof] = await Promise.all([
    db.prepare(`
      SELECT id, file_name, original_name, payer, upload_date, total_amount, file_data
      FROM invoices
      WHERE process_id = ?
      ORDER BY upload_date ASC
    `).bind(id).all<InvoiceRow>(),
    db.prepare(`
      SELECT id, date, description, amount, assignment, payer, source, source_invoice_id, category
      FROM transactions
      WHERE process_id = ?
      ORDER BY date DESC, created_at DESC
    `).bind(id).all<TransactionRow>(),
    db.prepare(`
      SELECT file_name, date, file_data
      FROM proofs
      WHERE process_id = ?
    `).bind(id).first<ProofRow>(),
  ]);

  return {
    id: process.id,
    name: process.name,
    createdAt: process.created_at,
    closedAt: process.closed_at ?? undefined,
    status: process.status,
    transactions: transactionsResult.results.map((tx) => ({
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
    invoices: invoicesResult.results.map((invoice) => ({
      id: invoice.id,
      fileName: invoice.file_name,
      originalName: invoice.original_name,
      payer: invoice.payer,
      uploadDate: invoice.upload_date,
      totalAmount: invoice.total_amount,
      fileData: invoice.file_data ?? "",
    })),
    proofOfPayment: proof
      ? {
          fileName: proof.file_name,
          date: proof.date,
          fileData: proof.file_data ?? "",
        }
      : undefined,
    closingBalance: process.closing_debtor && process.closing_amount != null
      ? {
          debtor: process.closing_debtor,
          amount: process.closing_amount,
        }
      : undefined,
    carriedOverToProcessId: process.carried_over_to_process_id,
  };
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = getId(params);
  const process = await loadProcess(env.DB, id);

  if (!process) {
    return jsonResponse({ error: "Process not found." }, 404);
  }

  return jsonResponse({ process });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = getId(params);
  const process = await request.json<ProcessPayload>().catch(() => null);

  if (!process || process.id !== id || !process.name?.trim()) {
    return jsonResponse({ error: "Invalid process payload." }, 400);
  }

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`
      INSERT INTO processes (
        id,
        name,
        status,
        created_at,
        closed_at,
        closing_debtor,
        closing_amount,
        carried_over_to_process_id,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        status = excluded.status,
        created_at = excluded.created_at,
        closed_at = excluded.closed_at,
        closing_debtor = excluded.closing_debtor,
        closing_amount = excluded.closing_amount,
        carried_over_to_process_id = excluded.carried_over_to_process_id,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      process.id,
      process.name,
      process.status,
      process.createdAt,
      process.closedAt ?? null,
      process.closingBalance?.debtor ?? null,
      process.closingBalance?.amount ?? null,
      process.carriedOverToProcessId ?? null,
    ),
    env.DB.prepare("DELETE FROM transactions WHERE process_id = ?").bind(id),
    env.DB.prepare("DELETE FROM proofs WHERE process_id = ?").bind(id),
    env.DB.prepare("DELETE FROM invoices WHERE process_id = ?").bind(id),
  ];

  for (const invoice of process.invoices) {
    statements.push(env.DB.prepare(`
      INSERT INTO invoices (
        id,
        process_id,
        file_name,
        original_name,
        payer,
        upload_date,
        total_amount,
        file_data,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      invoice.id,
      id,
      invoice.fileName,
      invoice.originalName,
      invoice.payer,
      invoice.uploadDate,
      invoice.totalAmount,
      invoice.fileData,
    ));
  }

  for (const tx of process.transactions) {
    statements.push(env.DB.prepare(`
      INSERT INTO transactions (
        id,
        process_id,
        date,
        description,
        amount,
        assignment,
        payer,
        source,
        source_invoice_id,
        category,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      tx.id,
      id,
      tx.date,
      tx.description,
      tx.amount,
      tx.assignment,
      tx.payer,
      tx.source,
      tx.sourceInvoiceId ?? null,
      tx.category ?? null,
    ));
  }

  if (process.proofOfPayment) {
    statements.push(env.DB.prepare(`
      INSERT INTO proofs (process_id, file_name, date, file_data, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      id,
      process.proofOfPayment.fileName,
      process.proofOfPayment.date,
      process.proofOfPayment.fileData,
    ));
  }

  await env.DB.batch(statements);

  const savedProcess = await loadProcess(env.DB, id);
  return jsonResponse({ process: savedProcess });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = getId(params);
  await env.DB.prepare("DELETE FROM processes WHERE id = ?").bind(id).run();
  return jsonResponse({ ok: true });
};

export const onRequest: PagesFunction<Env> = async () => {
  return jsonResponse({ error: "Method not allowed." }, 405);
};
