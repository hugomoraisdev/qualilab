// Presets de organização documental usados em Documentos (PoC CISPAR).
// Os valores são apenas sugestões — o usuário pode digitar valores livres
// usando a opção "Outro…" em qualquer Select.

export const DOCUMENT_FOLDERS = [
  "SGQ > Procedimentos Operacionais",
  "SGQ > Instruções de Trabalho",
  "SGQ > Manuais",
  "SGQ > Registros",
  "SGQ > Formulários",
  "SGQ > Documentos Externos",
] as const;

export const DOCUMENT_SECTORS = [
  "Qualidade",
  "Laboratório",
  "Compras",
  "Calibração",
  "Atendimento",
  "Gestão",
] as const;

export const DOCUMENT_PROCESSES = [
  "Coleta de Amostras",
  "Análise Laboratorial",
  "Calibração de Equipamentos",
  "Tratamento de Não Conformidades",
  "Avaliação de Fornecedores",
  "Gestão de Documentos",
  "Auditorias",
] as const;

export const DOCUMENT_CATEGORIES = [
  "POP",
  "IT",
  "Manual",
  "Política",
  "Procedimento",
  "Instrução de trabalho",
  "Registro",
  "Formulário",
  "Certificado",
  "Documento Externo",
  "Norma externa",
] as const;

export const OUTRO_VALUE = "__outro__";
