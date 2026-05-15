
# Documentos — Organização + Campos Personalizados (PoC CISPAR)

## 1. Taxonomia (pasta / setor / processo / categoria)

- `documents.category` já existe na tabela. `folder`, `sector`, `process` já existem em `document_meta-store` (em `app_data`).
- **Estender o cadastro de novo documento** (`src/routes/_app/documents.tsx`, `NewDocumentDialog`) com 3 campos novos (Pasta, Setor, Processo) usando `Select` com presets do edital + opção “Outro…”. Após salvar o documento, gravar via `setDocumentTaxonomy` no meta-store.
- **Tela de detalhe** (`documents.$id.tsx`): a aba “Organização” já permite editar pasta/setor/processo. Garantir presets nos selects. Sem mudança estrutural.
- Criar `src/lib/document-taxonomy.ts` com as listas-presets (folders, sectors, processes, categories) reutilizáveis em todas as telas.

## 2. Listagem com filtros e colunas

Refatorar `src/routes/_app/documents.tsx`:

- Carregar `useAllDocumentMeta(documentIds)` para hidratar pasta/setor/processo/custom_fields.
- Adicionar barra de filtros acima da `DataTable`: Categoria, Pasta, Setor, Processo, Status, Responsável (selects com “Todos”).
- Adicionar tabs no topo: **“Documentos”** (visão atual enxuta) e **“Lista Mestra”** (todas as colunas: código, título, categoria, pasta, setor, processo, versão vigente, validade, responsável, status).
- A busca textual da `DataTable` permanece para código/título/responsável.

## 3. Campos personalizados — engine

### Storage
- Reutilizar `app_data` com chave `custom-fields:documents` → `value: CustomFieldDef[]`.
- Novo módulo `src/lib/custom-fields-store.ts`:
  ```ts
  export interface CustomFieldDef {
    id: string; name: string; key: string;
    type: "text"|"textarea"|"number"|"date"|"select"|"multiselect"|"checkbox"|"attachment"|"user"|"sector"|"process"|"unit"|"status";
    required: boolean; order: number; active: boolean;
    options?: string[]; visibleRoles?: string[];
  }
  ```
  Funções: `listFields`, `saveField`, `deleteField`, `reorder`, hook `useCustomFields("documents")` com realtime.
- Valores por documento: já há `custom_fields: Record<string,string>` em `document-meta-store`. Estender para `Record<string, string | string[] | boolean | number>` mantendo compat.

### Configuração
- Nova aba no Settings (`src/routes/_app/settings.tsx`): **“Campos Personalizados → Documentos”**. CRUD em modal com todos os parâmetros (nome, tipo, obrigatório, ordem, opções, visibilidade por perfil, ativo).

### Renderização dinâmica
- Componente `src/components/CustomFieldsRenderer.tsx` que recebe lista de definitions + values + onChange e renderiza os inputs apropriados (text, textarea, number, date, Select, multiselect, checkbox, file→data URL, user→Select de profiles, sector/process→Select com presets, unit→Select de `lab_units`, status→Select).
- Integrar no **NewDocumentDialog** e na aba “Organização” do detalhe (substituindo/expandindo o quadro atual de “Campos personalizados”).
- Validar obrigatoriedade no submit. Filtrar campos inativos no formulário, mas preservar valores antigos (não apagar do `custom_fields`).

### Filtros / colunas
- Listagem mestra: campos ativos com tipos `select`, `status`, `sector`, `process`, `unit`, `checkbox` viram filtros adicionais; demais aparecem como colunas opcionais (toggle simples).

## 4. Auditoria
- Cada save de documento (taxonomia ou custom field) chama `logAudit("documents", "updated", id, label, before, after)` com diff campo a campo. `logAudit` já existe em `src/lib/audit.ts`.

## 5. Arquivos tocados
- ➕ `src/lib/document-taxonomy.ts`
- ➕ `src/lib/custom-fields-store.ts`
- ➕ `src/components/CustomFieldsRenderer.tsx`
- ✏️ `src/routes/_app/documents.tsx` (filtros + tabs + Lista Mestra + campos no diálogo)
- ✏️ `src/routes/_app/documents.$id.tsx` (renderer dinâmico, presets nos selects)
- ✏️ `src/routes/_app/settings.tsx` (aba Campos Personalizados)
- ✏️ `src/lib/document-meta-store.ts` (tipo do `custom_fields` ampliado)

## Fora de escopo (confirmar se quiser depois)
- Migração das chaves de `custom_fields` antigas para os novos `key` definidos em `CustomFieldDef`.
- Permissões granulares por perfil em runtime (apenas filtragem visual).
- Versionamento dos próprios campos personalizados.

Posso seguir com essa implementação?
