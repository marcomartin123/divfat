interface Env {
  DB: D1Database;
}

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = await env.DB.prepare(`
    SELECT id, person, process_id, type, amount, description, entry_date, created_at
    FROM balance_entries
    ORDER BY entry_date DESC
  `).all();

  const entries = result.results.map((row: any) => ({
    id: row.id,
    person: row.person,
    processId: row.process_id ?? undefined,
    type: row.type,
    amount: row.amount,
    description: row.description,
    entryDate: row.entry_date,
    createdAt: row.created_at,
  }));

  return jsonResponse({ entries });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    person: string;
    processId?: string;
    type: string;
    amount: number;
    description: string;
    entryDate: string;
  }>().catch(() => null);

  if (!body || !body.person || !body.type || !body.amount || !body.description || !body.entryDate) {
    return jsonResponse({ error: "Missing required fields: person, type, amount, description, entryDate." }, 400);
  }

  if (!['PERSON_A', 'PERSON_B'].includes(body.person)) {
    return jsonResponse({ error: "person must be PERSON_A or PERSON_B." }, 400);
  }

  if (!['DEBIT', 'CREDIT'].includes(body.type)) {
    return jsonResponse({ error: "type must be DEBIT or CREDIT." }, 400);
  }

  const id = generateId();

  await env.DB.prepare(`
    INSERT INTO balance_entries (id, person, process_id, type, amount, description, entry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.person,
    body.processId ?? null,
    body.type,
    Math.abs(body.amount),
    body.description,
    body.entryDate,
  ).run();

  const entry = {
    id,
    person: body.person,
    processId: body.processId,
    type: body.type,
    amount: Math.abs(body.amount),
    description: body.description,
    entryDate: body.entryDate,
    createdAt: new Date().toISOString(),
  };

  return jsonResponse({ entry }, 201);
};

export const onRequest: PagesFunction<Env> = async () => {
  return jsonResponse({ error: "Method not allowed." }, 405);
};
