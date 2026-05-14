## Análise (Status atual do módulo Ocorrências)

| Requisito | Status | Onde |
|---|---|---|
| Registrar ocorrência / reclamação / NC | ✅ | `occurrences` + `tickets` |
| Responsável | ✅ | `responsible_id` |
| Prazo de tratamento | ❌ | sem coluna `deadline` |
| 5 Porquês / Ishikawa / Brainstorm | ✅ | `RootCauseSection` |
| 5W2H | ❌ | não existe |
| Plano de ação | ✅ | `action_plans` (sem vínculo direto na UI da ocorrência) |
| Notificações de prazo / vencidas | ✅ (ações) / ❌ (ocorrência) | `notifications.ts` |
| Verificação de eficácia | ❌ | sem campo |
| Vínculo a riscos | ❌ | só audit/documento |
| Vínculo a fornecedores | ❌ | — |
| Vínculo a auditorias | ✅ | `linked_audit_id` (não exposto) |
| Anexos / evidências | ❌ | — |
| Relatório / análise de tendência | ⚠️ parcial | apenas tabela |
| Histórico completo | ⚠️ | `audit_logs` existe mas sem trigger em `occurrences` |
| Etapas / acompanhamento | ⚠️ | só status |
| Campos personalizados | ❌ | — |

## Plano de implementação

### 1. Migração
Adicionar à tabela `occurrences`:
- `deadline date`
- `linked_risk_id uuid`, `linked_supplier_id uuid`
- `effectiveness_status text`, `effectiveness_verified_at date`, `effectiveness_notes text`, `effectiveness_verified_by uuid`
- `attachments jsonb default '[]'`
- `custom_fields jsonb default '{}'`
- `five_w2h jsonb` (What/Why/Where/When/Who/How/HowMuch)
- Trigger `log_table_audit('ocorrencias','description')` → `audit_logs`

### 2. Store
Atualizar `occurrences-store.ts` com novos campos e tipos `FiveW2HData`, `Attachment`.

### 3. Detalhe da ocorrência (`occurrences.$id.tsx`)
Reorganizar em abas:
- **Visão geral**: edição inline de tipo, severidade, status, responsável, prazo, ação imediata, vínculos (risco / fornecedor / auditoria / documento), campos personalizados.
- **Causa raiz**: 5 Porquês, Ishikawa, Brainstorm (mantido) + nova aba **5W2H**.
- **Plano de ação**: lista filtrada de `action_plans` com `origin_type='occurrence'` + `origin_id`, botão "Nova ação" pré-preenchido.
- **Eficácia**: registrar verificação (status, data, responsável, notas).
- **Anexos**: lista de URLs/descrições.
- **Histórico**: timeline lida de `audit_logs` (módulo `ocorrencias`).

### 4. Lista (`occurrences.tsx`)
- Cards de KPIs: Abertas / Em análise / Atrasadas / Concluídas.
- Mini-gráfico de tendência (últimos 6 meses, por tipo).
- Filtros rápidos por status/tipo/severidade.
- Botão "Nova ocorrência" abre dialog com campos completos.

### 5. Notificações
Em `notifications.ts`, nova categoria `occurrence`: alerta quando `deadline` ≤ 7 dias ou vencida e status ≠ concluida.

### 6. PDF
Estender `pdf-export.ts` com `exportOccurrencesPdf` (lista + responsável + prazo + status + vínculos).

## Arquivos
- migration SQL
- `src/lib/occurrences-store.ts` (atualizar)
- `src/routes/_app/occurrences.$id.tsx` (refatorar com abas)
- `src/routes/_app/occurrences.tsx` (KPIs + dialog)
- `src/lib/notifications.ts` (categoria occurrence)
- `src/lib/pdf-export.ts` (export ocorrências)
- `src/components/AuditLogTimeline.tsx` (componente reutilizável de histórico, se ainda não existir)
