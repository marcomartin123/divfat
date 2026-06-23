export const CATEGORIES = [
  "Supermercado",
  "Restaurante",
  "Transporte",
  "Serviços Digitais",
  "Viagem",
  "Saúde",
  "Educação",
  "Lazer",
  "Casa/Compras",
  "Pets",
  "Beleza",
  "Serviços",
  "Financeiro",
  "Outros",
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const CATEGORY_RULES: Array<[string, RegExp]> = [
  ["Financeiro", /\b(fatura anterior|saldo anterior|pagamento|debito em conta|debito automati|mastercard nacional|cobranca terceirizada|iof|tarifa|multa|juros|anuidade|seguro|saque)\b/i],

  ["Serviços Digitais", /\b(netflix|apple\.com\/bill|amazonprimebr|amazon prime canais|prime video|google|openai|chatgpt|spotify|icloud|microsoft|youtube|disney|globoplay|airscreen|esim\.sm|nvidia)\b/i],

  ["Viagem", /\b(airbnb|decolar|hotel|booking|latam|azul|gol\b|gru embarque|passagem|viagem)\b/i],

  ["Transporte", /\b(uber|99app|cabify|posto|auto posto|combustivel|combustível|shell|ipiranga|petrobras|estapar|allpark|viaparking|estacionamento|shopping center morumb|sem parar)\b/i],

  ["Restaurante", /\b(restaurante|rest\b|ifd\*|ifood|rappi\*moustache|rappi\*grupo fartura|super grill|hanjou sushi|dom chico|reyel restaurante|ls restaurante|moonlight coffee|coffee|cafet|padaria|panificadora|paes|pães|bolo|pronto il forno|sodiedoces|gelatos|sorvetes|sorveteria|gastrohsmartfoods|space sete com de alim|quiosque|kiosque|beach bar|bar\b|pizza|sushi|lanch)\b/i],

  ["Supermercado", /\b(lemon supermercado|carrefour|mercado\*10produtos|mercado\*mercadolivre|mercado\*deviradasport|supermerc|atacad|assai|assaí|extra farma|hortifruti|wand morangos|frigorifico|açougue|acougue)\b/i],

  ["Saúde", /\b(drogaria|droga|raia\d*|farmacia|farmácia|natuvita|clinica|clínica|hospital|laboratorio|laboratório|medic|sonocomsono)\b/i],

  ["Pets", /\b(cobasi|petsupermarket|pet shop|petshop|veterin)\b/i],

  ["Beleza", /\b(cabeleireiros|cabeleireiro|salao|salão|depilaca|depilação|barbearia|estetica|estética|leolavarapido|maria zamlutti|geovannalenha|lucimardeoliveira)\b/i],

  ["Casa/Compras", /\b(leroy merlin|kalunga|pernambucanas|campo belo store|casalarutilid|x eletronic|shopee|h&m|cea mrb|vivara|ri happy|isa magazine|sellisartesanato|mercadolivre|mercado livre|amazon\b|ciranda de papel|verbo divino|divino|ponteio morumbi|loja morumbi|00043 sh morumbi|7015 morumbi|strollerfy|henri comercio|m\. r\. martins|shine one|benditas|deviradasport|atelie joaquim)\b/i],

  ["Educação", /\b(escola|colegio|colégio|curso|faculdade|universidade|livraria)\b/i],

  ["Lazer", /\b(cinemark|cinema|teatro|ingresso|show|sympla|evento|games?|steam|playstation|xbox|iguasport)\b/i],

  ["Serviços", /\b(internet|telefone|vivo|claro|tim|oi\b|energia|luz|agua|água|sabesp|enel|condominio|condomínio|lavanderia|formulaiautop|equibombaspis|cantodaspisci)\b/i],
];

export const categorizeTransaction = (description: string) => {
  const normalizedDescription = normalize(description);

  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(normalizedDescription)) return category;
  }

  return "Outros";
};
