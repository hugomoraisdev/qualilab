// Mapa de processos — Fase 2B (tabela dedicada no Supabase).
// SQL para criar a tabela (executar no Supabase SQL Editor):
//
// CREATE TABLE IF NOT EXISTS process_maps (
//   id TEXT PRIMARY KEY,
//   name TEXT NOT NULL,
//   objective TEXT,
//   owner TEXT,
//   inputs TEXT,
//   outputs TEXT,
//   risks INT DEFAULT 0,
//   docs INT DEFAULT 0,
//   status TEXT DEFAULT 'Ativo',
//   deleted_at TIMESTAMPTZ,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE process_maps ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "authenticated_read_process_maps" ON process_maps
//   FOR SELECT USING (auth.uid() IS NOT NULL);
// CREATE POLICY "admin_manage_process_maps" ON process_maps
//   FOR ALL USING (
//     EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
//   );
//
// INSERT de dados de demonstração (executar após criar a tabela):
// INSERT INTO process_maps (id, name, owner, objective, inputs, outputs, status, risks, docs) VALUES
//   ('PROC-001','Recebimento de Amostras','Mariana Técnica','Garantir rastreabilidade desde a chegada da amostra','Amostra do cliente, formulário de solicitação','Amostra identificada e registrada','Ativo',2,4),
//   ('PROC-002','Análises Físico-Químicas','Roberto Gestor','Executar análises conforme métodos validados','Amostra, POP, equipamento calibrado','Resultado analítico rastreável','Ativo',4,8),
//   ('PROC-003','Emissão de Relatórios','Carla Administradora','Emitir relatórios conforme requisitos do cliente','Resultados validados','Relatório de ensaio assinado','Ativo',2,3),
//   ('PROC-004','Gestão de Equipamentos','Mariana Técnica','Garantir equipamentos calibrados e em condições de uso','Cronograma de calibração','Equipamento liberado para uso','Ativo',3,5),
//   ('PROC-005','Gestão de Fornecedores','Roberto Gestor','Selecionar e avaliar fornecedores críticos','Necessidades do laboratório','Fornecedor qualificado','Ativo',2,4),
//   ('PROC-006','Gestão de Pessoas','Carla Administradora','Garantir competência técnica da equipe','Matriz de competências','Equipe treinada e qualificada','Ativo',1,3);

import { createTableStore } from "./table-store";

export interface ProcessMapRow {
  id: string;
  name: string;
  objective: string | null;
  owner: string | null;
  inputs: string | null;
  outputs: string | null;
  risks: number;
  docs: number;
  status: string;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const processMapsStore = createTableStore<ProcessMapRow>("process_maps", "name", true);

export const listProcessMaps = () => processMapsStore.list();
export const saveProcessMap = (p: ProcessMapRow) => processMapsStore.upsert(p);
export const deleteProcessMap = (id: string) => processMapsStore.remove(id);
