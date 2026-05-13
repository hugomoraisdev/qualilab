
# Plano de execução — POC CISPAR 08/2026

Empresa: **AMARAL CORRETORA E ADMINISTRADORA DE SEGUROS LTDA** — CNPJ 40.646.971/0001-28 — Porto Alegre/RS
Representante legal: **Vitoria Amaral Monteiro** (Sócia Administradora)
Responsável técnico: **Hugo Morais De Araujo** — Head de Sistemas — Análise e Desenvolvimento de Sistemas (sem registro de classe — vou declarar "não aplicável" no DOCX)

## Aviso de escopo

O que você pediu equivale a **3 sprints de trabalho**. Vou entregar em fases, validando cada uma antes da próxima. Se eu tentar fazer tudo de uma vez vou quebrar a POC que está funcionando hoje.

**O que NÃO vou fazer sem você confirmar de novo no meio do caminho:**
- Apagar dados de localStorage existentes (vou manter como fallback até a migração estar 100%)
- Mexer em módulos funcionando para "melhorar" sem necessidade
- Inventar registro CREA/CRA para o RT — vou deixar "Head de Sistemas, formado em ADS, sem registro de classe aplicável"

---

## FASE 1 — Lovable Cloud + autenticação real (esta resposta)

1. Ativar Lovable Cloud
2. Criar tabela `profiles` + tabela `user_roles` com enum `app_role` (admin/gestor/tecnico/auditor/consulta) — substitui o auth mock atual
3. Trigger `handle_new_user` para auto-popular profile no signup
4. Substituir `src/lib/auth.tsx` (hoje mock localStorage) por Supabase Auth real, mantendo a mesma API (`useAuth`, `user.role`) para não quebrar `permissions.ts` e `AppSidebar`
5. Página `/login` real (email+senha, 1ª iteração; Google fica para depois se você quiser)
6. Documentar credenciais de teste para a banca

**Entregável:** login real funciona, papéis vêm do banco, RLS preparado mas tabelas de domínio ainda em localStorage.

---

## FASE 2 — Migrar stores críticos para Cloud (próxima resposta)

Ordem por criticidade na POC e no edital (req 1.3, 13.13 — log auditoria multiusuário):

1. `audit-log` (CRÍTICO — req 1.3) — tabela + insert em todas as ações
2. `document-reads-store` (CRÍTICO — confirmação leitura multiusuário)
3. `meetings-store` (atas, recorrência)
4. `calibration-store`
5. `forms-store`
6. `sac-store`

Cada store vira: tabela + RLS + service no client. Mantenho `mock-data.ts` apenas para seed inicial.

**Entregável:** dois usuários em browsers diferentes veem os mesmos dados.

---

## FASE 3 — Gaps funcionais do edital

1. **Req 3.3 — Ishikawa + 5 Porquês** como ferramentas nativas (forms estruturados em `/occurrences/$id`, não texto livre). 5W2H já existe.
2. **Req 4.6 — vínculo Risco ↔ Ocorrência** (FK + UI nos dois lados)
3. **Req 5.7 — avaliação periódica automática de fornecedores** (cron de UI: ao abrir `/suppliers`, sistema detecta avaliações vencidas e cria pendências)
4. **Req 5.12 — portal do fornecedor** (rota pública `/portal-fornecedor/$token` com acesso restrito)
5. **Req 8.7 — histórico da matriz de competências** por colaborador
6. **Req 9.7 — Gantt em /projects**
7. **Req 12 — mapa de processos editável** (drag-and-drop de blocos)
8. **Req 2.4 — modo offline auditorias**: vou implementar **Service Worker + IndexedDB queue** OU declarar como "fase 2 pós-contrato" no Memorial. Recomendo declarar — implementação real é 1-2 dias só disso.

---

## FASE 4 — DOCX formais

Gerar 4 documentos preenchidos com os dados acima:
1. **Declaração Formal de Atendimento aos Requisitos** (item 3.15)
2. **Memorial Descritivo** (arquitetura real: TanStack Start + Cloudflare Workers + Supabase/Lovable Cloud Postgres + RLS; SLA 99% — vou ajustar de 99,5% para 99% por segurança contratual; RPO 24h / RTO 4h; backup diário Supabase com retenção 7 dias no plano free, 30 dias no Pro — preciso confirmar plano com você)
3. **Matriz de Aderência** (Tabelas 02, 03, 04) — uma linha por requisito com SIM/NÃO + módulo + tela
4. **Indicação de Profissionais Técnicos** (item 3.9) — Hugo + Vitoria

Todos com bloco de assinatura "Porto Alegre, ___ de _____ de 2026".

---

## Decisões que preciso de você ANTES de começar a Fase 4

1. **SLA**: declaro **99% (8h/mês de janela)** ou **99,5% (3,6h/mês)**? Cloudflare Workers entrega ~99,99% mas Supabase free tier não tem SLA contratual. Recomendo 99%.
2. **Retenção de backup**: 7 dias (Supabase free) ou 30 dias (precisa Pro $25/mês)?
3. **Modo offline auditoria (req 2.4)**: implemento Service Worker ou declaro como roadmap?
4. **Registro de classe do Hugo**: confirma que pode ir como "não aplicável" no DOCX?

---

## Detalhes técnicos (referência)

- Auth: `@supabase/supabase-js` browser client + `requireSupabaseAuth` middleware em server functions futuras
- Roles: tabela `user_roles` separada + função `has_role()` SECURITY DEFINER (nunca em `profiles`)
- RLS: todas as tabelas com RLS ON; policies usando `has_role(auth.uid(), 'admin')`
- Migração de stores: mantenho a mesma assinatura (`listX()`, `addX()`) mas troco implementação interna para Supabase. Componentes não mudam.
- Realtime: subscribe em `audit-log` e `document-reads` para atualização ao vivo durante a POC

## Próxima ação

Se você aprovar, começo imediatamente pela **Fase 1** (Cloud + auth real). Me responde com as 4 decisões acima e eu sigo.
