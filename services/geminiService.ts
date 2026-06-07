import { ExtractedData } from "../types";

const fileToBase64Payload = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve({
        data: base64String,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const parseInvoicePDF = async (file: File): Promise<ExtractedData> => {
  const filePayload = await fileToBase64Payload(file);

  const response = await fetch("/api/parse-invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: filePayload,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Ocorreu um erro ao processar o PDF.");
  }

  return data as ExtractedData;
};
