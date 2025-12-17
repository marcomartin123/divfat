import { createClient } from '@supabase/supabase-js';
import { Process } from '../types';

// Credenciais fornecidas pelo usuário
const SUPABASE_URL = 'https://jurmhcryaftgjdstmuid.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cm1oY3J5YWZ0Z2pkc3RtdWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDkwNjEsImV4cCI6MjA4MDI4NTA2MX0.a7nNHD8eOOXpgRUTqeBSDh7UvWsf9SL-Z5VBsHHhEk0';

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// Nome do bucket corrigido conforme solicitação
const BUCKET_NAME = 'divfat';
const FILE_NAME = 'backup_financeiro.json';

export const saveBackupToSupabase = async (data: Process[]): Promise<void> => {
  try {
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Tenta fazer upload com upsert (sobrescrever)
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, blob, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Erro ao salvar no Supabase:', error);
    throw new Error(`Erro ao salvar na nuvem: ${error.message || 'Verifique se o bucket "divfat" existe e é público.'}`);
  }
};

export const loadBackupFromSupabase = async (): Promise<Process[]> => {
  try {
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(FILE_NAME);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Arquivo não encontrado.");
    }

    const text = await data.text();
    const processes = JSON.parse(text) as Process[];
    return processes;
  } catch (error: any) {
    console.error('Erro ao baixar do Supabase:', error);
    throw new Error(`Erro ao baixar da nuvem: ${error.message || 'Verifique se o arquivo existe.'}`);
  }
};