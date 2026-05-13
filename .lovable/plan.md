# Fase 2B — Modelagem Relacional Completa

A Fase 2A persistiu tudo em `app_data` (JSON). A Fase 2B troca isso por **tabelas dedicadas** com FKs, índices, RLS por papel e Realtime — em **3 lotes independentes**, cada um com migração + refactor de stores + manutenção de API pública.

---

## Princípios

1. **Stores mantêm a mesma assinatura pública** (`listX`, `saveX`, `deleteX`) — nenhum componente precisa mudar. Internamente passam a chamar Supabase ao invés do `CloudStore`.
2. **RLS por papel** usando `has_role()` (já existe).
3. **Soft delete** via coluna `deleted_at` para módulos auditáveis (NCs, riscos, auditorias).
4. **Realtime** habilitado em todas as tabelas que a UI consome ao vivo.
5. **Migração de dados:** seeds estáticos de `mock-data.ts` viram `INSERT` idempotentes (`ON CONFLICT DO NOTHING`) na primeira migração de cada lote.

---

## Lote 1 — Núcleo da Qualidade (este turno)

Módulos mais interconectados; valor imediato.

| Tabela | Campos principais | RLS |
|---|---|---|
| `documents` | code, title, category, version, status, validity, responsible_id, file_url | view: todos auth · write: admin/gestor |
| `document_reads` | document_id (FK), user_id (FK), confirmed_at | view+insert: self · admin lê tudo |
| `occurrences` | type, origin, description, date, severity, status, responsible_id, linked_* | view: auditor+ · write: tecnico+ |
| `risks` | process, description, cause, consequence, probability, impact, level (gerada), classification (gerada), responsible_id, status | view: auditor+ · write: gestor+ |
| `action_plans` | origin_type, origin_id, description, responsible_id, deadline, priority, status, progress | view: todos auth · write: gestor+ |

**Triggers:** `risks.level = probability * impact` calculado automaticamente; `set_updated_at` em todas; classificação derivada por trigger.

**Refactor:** cria `src/lib/documents-store.ts`, `occurrences-store.ts`, `risks-store.ts`, `action-plans-store.ts`. Telas que hoje usam `mock-data.ts` passam a usar os novos stores. `document-reads-store.ts` migra de `app_data` → tabela.

---

## Lote 2 — Operação (próximo turno, sob aprovação)

| Tabela | Função |
|---|---|
| `equipments` | Cadastro de equipamentos |
| `calibrations` | Cabeçalho da calibração |
| `calibration_points` | Pontos individuais (FK para calibrations) |
| `suppliers` | Fornecedores + classificação |
| `purchases` | Processos de compra |
| `competencies` | Matriz colaborador × competência |

Substitui `calibration-store.ts` (hoje em CloudStore) e migra `equipments`, `suppliers`, `purchases`, `competencies` de `mock-data.ts`.

---

## Lote 3 — Processos (turno final, sob aprovação)

| Tabela | Função |
|---|---|
| `audits` + `audit_findings` | Auditorias com achados vinculados a NCs |
| `meetings` + `meeting_agenda_items` | Reuniões com pauta normalizada (FK) |
| `meeting_recurrences` | Série + frequência + limite |
| `custom_forms` + `form_fields` + `form_responses` | Formulários e respostas com aprovação |
| `audit_log` | Trilha de auditoria de ações administrativas |

Substitui `meetings-store.ts`, `forms-store.ts` (CloudStore) e `audits`, `auditLog` (mock).

---

## Detalhes técnicos do Lote 1 (a executar agora)

### Migração SQL (resumo)

- Cria 5 tabelas com `id uuid PK default gen_random_uuid()`, `created_at`, `updated_at`.
- FKs: `responsible_id → profiles(id)`, `action_plans.origin_id → occurrences/risks/audits` (genérico via `origin_type` discriminador).
- Generated columns: `risks.level GENERATED ALWAYS AS (probability * impact) STORED`.
- RLS habilitado + policies por operação (SELECT/INSERT/UPDATE/DELETE).
- Índices em colunas filtradas: `status`, `severity`, `validity`, `deadline`.
- Trigger `set_updated_at` em todas.
- Adição à publicação `supabase_realtime`.
- Seeds: `INSERT … ON CONFLICT (code) DO NOTHING` para os documentos/equipamentos atuais; `responsible_id` = NULL inicialmente (texto preservado em coluna `responsible_name` legacy).

### Refactor de código

- 4 stores novos com a mesma forma das funções pré-existentes.
- `documents.tsx`, `documents.$id.tsx`, `occurrences.tsx`, `occurrences.$id.tsx`, `risks.tsx`, `risks.$id.tsx`, `action-plans.tsx` passam a importar dos stores em vez de `mock-data.ts`.
- `document-reads-store.ts` reescrito: lê/escreve direto na tabela, escuta Realtime.
- Validação de role na UI permanece via `usePermission`; o RLS é a 2ª linha de defesa.

### Compatibilidade

- Stores expõem versão **assíncrona** (`async listOccurrences()`) onde necessário, e versão síncrona via cache para listas que são consultadas em loops de render.
- Padrão idêntico ao `CloudStore`: hidrata na montagem, mantém cache, dispara `storage:KEY` para invalidação.

---

## Confirmação

Posso executar o **Lote 1 agora** (1 migração + 4 stores + ~7 telas refatoradas). Os Lotes 2 e 3 ficam para turnos seguintes, sob nova aprovação a cada um, para você revisar incrementalmente.

Confirma seguir com o **Lote 1**?
