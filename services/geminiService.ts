import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const transactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING, description: "Data da transação (YYYY-MM-DD)" },
    description: { type: Type.STRING, description: "Descrição do Lançamento" },
    amount: { type: Type.NUMBER, description: "Valor (R$). Positivo para despesas, NEGATIVO para créditos/pagamentos." },
    category: { 
      type: Type.STRING, 
      description: "Categoria" 
    }
  },
  required: ["date", "description", "amount", "category"],
};

const invoiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detectedTotal: { type: Type.NUMBER, description: "Valor Total da Fatura (Total a pagar)." },
    transactions: {
      type: Type.ARRAY,
      items: transactionSchema,
      description: "Lista completa de transações.",
    },
  },
  required: ["transactions", "detectedTotal"],
};

export const parseInvoicePDF = async (file: File): Promise<ExtractedData> => {
  try {
    const filePart = await fileToGenerativePart(file);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: {
        parts: [
          filePart,
          {
            text: `Você é um Agente Especialista em Extração de Dados Financeiros e Validação Contábil.

### OBJETIVO
Ler as imagens da fatura e gerar um JSON onde a soma aritmética de todas as transações listadas seja **EXATAMENTE IGUAL** ao Valor Total da Fatura (\`detectedTotal\`).

### 1. REGRA DE OURO: O FILTRO DE DATA (Anti-Duplicidade)
Faturas costumam ter um quadro de "Resumo" na primeira página (com totais agrupados por categoria, ex: "Encargos", "Despesas Nacionais") e depois uma lista detalhada de compras nas páginas seguintes.
O erro comum é somar o Resumo + a Lista Detalhada, duplicando valores.

Para evitar isso, aplique esta regra estrita para CADA linha extraída:
**"Esta linha possui uma DATA ESPECÍFICA (DD/MM) de transação impressa ao lado dela?"**
*   **SIM (Tem data):** É uma transação válida. Inclua no JSON.
*   **NÃO (Não tem data):** É um item de resumo ou totalizador. **IGNORE IMEDIATAMENTE.** (Exceção única: "Saldo Anterior" ou "Fatura Anterior").

### 2. LISTA NEGRA (BLACKLIST)
Nunca inclua como transação linhas que contenham estes termos (pois são apenas somatórios):
*   "Encargos e tarifas" / "Encargos totais"
*   "Despesas nacionais" / "Despesas internacionais"
*   "Total da fatura" / "Total a pagar"
*   "Subtotal"
*   "Créditos na fatura" (Item de resumo) / "Pagamento mínimo"

### 3. LÓGICA DE CÁLCULO (IMPORTANTE)
Para que a conta feche, você deve estruturar os dados assim:
1.  **Saldo Anterior:** Procure por "Fatura Anterior" ou "Saldo Anterior". Se houver valor, adicione como a primeira transação (valor positivo). Se não tiver data, use a data de abertura da fatura.
2.  **Pagamentos:** Procure por "Pagamento recebido", "Crédito efetuado" ou valores com sinal negativo (-) na lista detalhada. Converta para **FLOAT NEGATIVO**.
3.  **Compras/Taxas:** Liste todos os itens que tenham data e valor (inclusive IOF e pequenas taxas listadas individualmente).

**Fórmula de Validação:**
(Saldo Anterior) + (Compras e Taxas Individuais) - (Pagamentos e Créditos) == Valor Total da Fatura.

### 4. ESTRUTURA JSON DE RESPOSTA
Retorne APENAS o JSON cru:

{
  "detectedTotal": 0.00, // Float. O valor final a pagar impresso na fatura.
  "transactions": [
    {
      "date": "YYYY-MM-DD", // Data ISO. Se não houver ano na linha, infira pelo vencimento da fatura.
      "description": "String", // Nome limpo do estabelecimento.
      "amount": 0.00, // Float. Positivo para gastos. NEGATIVO para pagamentos/créditos.
      "category": "String" // Escolha: Supermercado, Restaurante, Transporte, Serviços Digitais, Viagem, Saúde, Educação, Lazer, Serviços, Financeiro, Outros.
    }
  ]
}

**AUTO-CORREÇÃO FINAL:**
Antes de responder, faça a soma. Se a sua soma calculada for MAIOR que o \`detectedTotal\`, verifique se você violou a "Regra de Ouro" e incluiu alguma linha de resumo sem data (como encargos agrupados). Se sim, remova essa linha e recalcule.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
        temperature: 0.1, 
      },
    });

    let text = response.text;
    if (!text) {
      throw new Error("Não foi possível extrair dados do PDF.");
    }

    // Limpeza robusta para remover blocos de código markdown caso a IA os inclua
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(text) as ExtractedData;
    return data;
  } catch (error) {
    console.error("Error parsing invoice:", error);
    throw error;
  }
};