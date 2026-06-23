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

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const result = await env.DB.prepare("DELETE FROM balance_entries WHERE id = ?").bind(id).run();

  if (result.meta.changes === 0) {
    return jsonResponse({ error: "Entry not found." }, 404);
  }

  return jsonResponse({ ok: true });
};

export const onRequest: PagesFunction<Env> = async () => {
  return jsonResponse({ error: "Method not allowed." }, 405);
};
