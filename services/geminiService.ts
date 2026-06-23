import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { ExtractedData } from "../types";
import { categorizeTransaction } from "./categoryRules";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type ParsedTransaction = ExtractedData["transactions"][number];

const MONTH_BY_NAME: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  março: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const SUMMARY_TERMS = [
  "ajuste de limite",
  "autorizacoes negadas",
  "autorizações negadas",
  "compras nacionais",
  "credito rotativo",
  "crédito rotativo",
  "despesas internacionais",
  "despesas nacionais",
  "encargos totais",
  "limite total",
  "melhor data",
  "pagamento minimo",
  "pagamento mínimo",
  "parcelamento",
  "pague com pix",
  "resumo",
  "subtotal",
  "total a pagar",
  "total da fatura",
  "valor total",
];

const PAYMENT_TERMS = [
  "pagamento",
  "pgto",
  "crédito",
  "credito",
  "estorno",
  "devolução",
  "devolucao",
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const parseMoney = (raw: string): number | null => {
  const hasTrailingNegative = /[-−]\s*$/.test(raw);
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[R$]/gi, "")
    .replace(/^\+/, "")
    .replace(/[+−-]$/, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;

  return hasTrailingNegative ? -Math.abs(value) : value;
};

const formatDate = (day: number, month: number, year: number) =>
  `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

const inferStatementYear = (text: string) => {
  const years = Array.from(text.matchAll(/\b(20\d{2})\b/g), (match) => Number(match[1]));
  if (years.length === 0) return new Date().getFullYear();

  const counts = new Map<number, number>();
  for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1);

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const parseDateFromLine = (line: string, defaultYear: number) => {
  const numericMatches = Array.from(line.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/g));
  const numeric = numericMatches.find((match) => match[3]) ?? numericMatches.find((match) => {
    const before = line.slice(Math.max(0, (match.index ?? 0) - 4), match.index ?? 0);
    return !/-\s*$/.test(before);
  });

  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : defaultYear;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return {
        date: formatDate(day, month, year),
        raw: numeric[0],
        index: numeric.index ?? 0,
      };
    }
  }

  const named = line.match(/\b(\d{1,2})\s+([a-zçãé]{3,9})\b/i);
  if (named) {
    const day = Number(named[1]);
    const month = MONTH_BY_NAME[normalize(named[2])];
    if (day >= 1 && day <= 31 && month) {
      return {
        date: formatDate(day, month, defaultYear),
        raw: named[0],
        index: named.index ?? 0,
      };
    }
  }

  return null;
};

const extractLastMoney = (line: string) => {
  const matches = Array.from(
    line.matchAll(/[-−+]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\s*[-−+]?|[-−+]?\s*(?:R\$\s*)?\d+,\d{2}\s*[-−+]?/g),
  );
  if (matches.length === 0) return null;

  const match = matches[matches.length - 1];
  const raw = match[0];
  const value = parseMoney(raw.replace("−", "-"));
  if (value == null) return null;

  return {
    value,
    raw,
    index: match.index ?? line.length - raw.length,
  };
};

const extractFirstMoney = (line: string) => {
  const match = line.match(/[-−+]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\s*[-−+]?|[-−+]?\s*(?:R\$\s*)?\d+,\d{2}\s*[-−+]?/);
  if (!match) return null;

  const value = parseMoney(match[0].replace("−", "-"));
  if (value == null) return null;

  return {
    value,
    raw: match[0],
    index: match.index ?? 0,
  };
};

const hasExplicitNegativeSign = (moneyRaw: string) => /^[-−]/.test(moneyRaw.trim()) || /[-−]$/.test(moneyRaw.trim());
const hasExplicitCreditSign = (moneyRaw: string) => /^\+/.test(moneyRaw.trim()) || /\+$/.test(moneyRaw.trim());

const detectAmount = (moneyRaw: string, description: string, parsedValue: number) => {
  if (hasExplicitNegativeSign(moneyRaw) || parsedValue < 0) {
    return -Math.abs(parsedValue);
  }

  // In the tested Genial statement, "+ R$" marks credits/payments on the invoice.
  if (hasExplicitCreditSign(moneyRaw)) {
    return -Math.abs(parsedValue);
  }

  const lowerDescription = normalize(description);
  const looksLikeCredit = PAYMENT_TERMS.some((term) => lowerDescription.includes(normalize(term)));

  return looksLikeCredit ? -Math.abs(parsedValue) : Math.abs(parsedValue);
};

const isLikelySummary = (line: string) => {
  const lower = normalize(line);
  return SUMMARY_TERMS.some((term) => lower.includes(normalize(term)));
};

const isLikelyInstallmentNoise = (description: string) =>
  /\b(parcela|parc)\s+\d{1,2}\s*[\/\\]\s*\d{1,2}\b/i.test(description) && description.length < 18;

const cleanDescription = (value: string) =>
  value
    .replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/g, " ")
    .replace(/\b\d{1,2}\s+[a-zçãé]{3,9}\b/gi, " ")
    .replace(/(?:R\$\s*)?[-−]?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?[-−]?\d+,\d{2}/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "")
    .trim();

const hasMeaningfulDescription = (description: string) =>
  /[a-zA-ZÀ-ÿ]{2,}/.test(description.replace(/\bR\b/gi, ""));

const extractDetectedTotal = (lines: string[]) => {
  const totalPatterns = [/total\s+(?:da\s+)?fatura/i, /total\s+a\s+pagar/i, /valor\s+total/i];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!totalPatterns.some((pattern) => pattern.test(line))) continue;

    const money = extractLastMoney(line);
    if (money && money.value > 0) return money.value;

    const nextLineMoney = extractFirstMoney(lines[index + 1] ?? "");
    if (nextLineMoney && nextLineMoney.value > 0) return nextLineMoney.value;
  }

  return undefined;
};

const extractDueDate = (lines: string[], defaultYear: number): string | undefined => {
  for (const line of lines) {
    const lower = normalize(line);
    if (/venciment/i.test(lower)) {
      const parsed = parseDateFromLine(line, defaultYear);
      if (parsed) return parsed.date;
    }
  }
  return undefined;
};

const normalizeTextItems = (items: Array<{ str?: string; transform?: number[] }>) => {
  const rows = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue;

    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    const rowKey = Math.round(y / 3) * 3;

    rows.set(rowKey, [...(rows.get(rowKey) ?? []), { x, text: item.str.trim() }]);
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
};

const extractTextLines = async (file: File) => {
  const data = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(...normalizeTextItems(content.items as Array<{ str?: string; transform?: number[] }>));
  }

  return lines;
};

const parseLines = (lines: string[]): ExtractedData => {
  const text = lines.join("\n");
  const defaultYear = inferStatementYear(text);
  const detectedTotal = extractDetectedTotal(lines);
  const dueDate = extractDueDate(lines, defaultYear);
  const fallbackDate = lines.map((line) => parseDateFromLine(line, defaultYear)).find(Boolean)?.date ?? formatDate(1, 1, defaultYear);
  const seen = new Set<string>();
  const transactions: ParsedTransaction[] = [];
  let pendingDate: ReturnType<typeof parseDateFromLine> = null;

  for (const line of lines) {
    const normalizedLine = normalize(line);
    if (/^(fatura anterior|saldo anterior)\b/.test(normalizedLine)) {
      const previousBalance = extractLastMoney(line);
      if (previousBalance && previousBalance.value > 0) {
        const description = cleanDescription(line.slice(0, previousBalance.index)) || "Fatura Anterior";
        const key = `${fallbackDate}|${description}|${Math.abs(previousBalance.value).toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          transactions.push({
            date: fallbackDate,
            description,
            amount: Math.abs(previousBalance.value),
            category: categorizeTransaction(description),
          });
        }
      }
      continue;
    }

    const parsedDate = parseDateFromLine(line, defaultYear);
    const money = extractLastMoney(line);

    if (parsedDate && !money && cleanDescription(line) === "") {
      pendingDate = parsedDate;
      continue;
    }

    const date = parsedDate ?? pendingDate;
    if (!date || !money) continue;
    if (isLikelySummary(line)) continue;

    let description = parsedDate
      ? cleanDescription(line.slice(parsedDate.index + parsedDate.raw.length, money.index))
      : cleanDescription(line.slice(0, money.index));
    if (!description) description = cleanDescription(line);
    if (!description || !hasMeaningfulDescription(description) || isLikelyInstallmentNoise(description)) continue;

    const amount = detectAmount(money.raw, description, money.value);

    const key = `${date.date}|${description}|${amount.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({
      date: date.date,
      description,
      amount,
      category: categorizeTransaction(description),
    });

    pendingDate = null;
  }

  if (transactions.length === 0) {
    throw new Error("Não consegui encontrar transações no PDF. O parser local precisa de texto selecionável e linhas com data, descrição e valor.");
  }

  if (detectedTotal != null) {
    const parsedTotal = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const difference = parsedTotal - detectedTotal;

    if (Math.abs(difference) > 0.05) {
      const format = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

      throw new Error(
        `Validação da fatura falhou: a soma das linhas deu ${format(parsedTotal)}, ` +
        `mas o total detectado é ${format(detectedTotal)}. Diferença: ${format(difference)}.`,
      );
    }
  }

  return {
    detectedTotal,
    transactions,
    invoiceDate: dueDate,
  };
};

export const parseInvoicePDF = async (file: File): Promise<ExtractedData> => {
  const lines = await extractTextLines(file);
  return parseLines(lines);
};
