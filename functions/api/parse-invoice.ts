const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const onRequest: PagesFunction = async () => {
  return jsonResponse(
    {
      error: "O parse de faturas agora roda localmente no navegador, sem API do Gemini.",
    },
    410,
  );
};
