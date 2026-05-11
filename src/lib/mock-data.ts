// Dados fictícios para POC do QualiLab
export const documents = [
  { id: "DOC-001", code: "MQ-001", title: "Manual da Qualidade", category: "Manual", version: "3.2", status: "Aprovado", validity: "2026-12-31", responsible: "Roberto Gestor" },
  { id: "DOC-002", code: "POP-014", title: "POP — Calibração de Pipetas Volumétricas", category: "POP", version: "2.0", status: "Aprovado", validity: "2026-08-15", responsible: "Mariana Técnica" },
  { id: "DOC-003", code: "POP-021", title: "POP — Operação Balança Analítica", category: "POP", version: "1.5", status: "Em revisão", validity: "2026-05-10", responsible: "Mariana Técnica" },
  { id: "DOC-004", code: "IT-007", title: "Instrução — Limpeza de Vidraria", category: "Instrução", version: "1.1", status: "Aprovado", validity: "2026-09-01", responsible: "Mariana Técnica" },
  { id: "DOC-005", code: "FR-003", title: "Formulário Registro de Temperatura", category: "Formulário", version: "2.3", status: "Aprovado", validity: "2026-11-20", responsible: "Roberto Gestor" },
  { id: "DOC-006", code: "POL-001", title: "Política da Qualidade", category: "Política", version: "4.0", status: "Aprovado", validity: "2027-01-15", responsible: "Carla Administradora" },
  { id: "DOC-007", code: "POP-009", title: "POP — Análise de pH", category: "POP", version: "1.8", status: "Vencido", validity: "2025-09-30", responsible: "Mariana Técnica" },
  { id: "DOC-008", code: "POP-031", title: "POP — Operação Espectrofotômetro", category: "POP", version: "2.1", status: "Aprovado", validity: "2026-10-12", responsible: "Paulo Auditor" },
  { id: "DOC-009", code: "REG-005", title: "Registro de Treinamentos", category: "Registro", version: "1.2", status: "Aprovado", validity: "2026-07-22", responsible: "Roberto Gestor" },
  { id: "DOC-010", code: "POP-045", title: "POP — Validação de Métodos Analíticos", category: "POP", version: "3.0", status: "Aprovado", validity: "2026-12-01", responsible: "Roberto Gestor" },
  { id: "DOC-011", code: "POP-052", title: "POP — Estufa de Secagem", category: "POP", version: "1.4", status: "Em revisão", validity: "2026-04-30", responsible: "Mariana Técnica" },
  { id: "DOC-012", code: "POP-060", title: "POP — Condutivímetro", category: "POP", version: "1.0", status: "Rascunho", validity: "2027-03-15", responsible: "Mariana Técnica" },
  { id: "DOC-013", code: "FR-018", title: "Formulário Não Conformidade", category: "Formulário", version: "3.1", status: "Aprovado", validity: "2026-06-10", responsible: "Roberto Gestor" },
  { id: "DOC-014", code: "POP-077", title: "POP — Coleta de Amostras", category: "POP", version: "2.5", status: "Aprovado", validity: "2026-08-20", responsible: "Mariana Técnica" },
  { id: "DOC-015", code: "IT-012", title: "Instrução — Descarte de Resíduos", category: "Instrução", version: "1.3", status: "Aprovado", validity: "2026-11-05", responsible: "Roberto Gestor" },
  { id: "DOC-016", code: "POP-080", title: "POP — Cromatografia", category: "POP", version: "1.0", status: "Em revisão", validity: "2026-09-15", responsible: "Paulo Auditor" },
  { id: "DOC-017", code: "REG-009", title: "Registro de Calibrações Anuais", category: "Registro", version: "2.0", status: "Aprovado", validity: "2026-12-31", responsible: "Roberto Gestor" },
  { id: "DOC-018", code: "MA-003", title: "Manual de Biossegurança", category: "Manual", version: "2.2", status: "Aprovado", validity: "2026-10-01", responsible: "Carla Administradora" },
  { id: "DOC-019", code: "POL-002", title: "Política de Imparcialidade", category: "Política", version: "1.5", status: "Aprovado", validity: "2027-02-28", responsible: "Carla Administradora" },
  { id: "DOC-020", code: "POP-099", title: "POP — Controle de Temperatura Refrigerador", category: "POP", version: "1.1", status: "Vencido", validity: "2025-08-15", responsible: "Mariana Técnica" },
];

export const equipments = [
  { id: "EQ-001", code: "BAL-001", name: "Balança Analítica Shimadzu", type: "Balança", manufacturer: "Shimadzu", model: "AUW220D", serial: "SH-2210045", location: "Sala de Pesagem", responsible: "Mariana Técnica", status: "Ativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2025-03-12", nextCal: "2026-03-12" },
  { id: "EQ-002", code: "PIP-001", name: "Pipeta Volumétrica 10 mL", type: "Pipeta", manufacturer: "Eppendorf", model: "Research Plus", serial: "EP-558712", location: "Bancada A", responsible: "Mariana Técnica", status: "Ativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2025-06-01", nextCal: "2026-06-01" },
  { id: "EQ-003", code: "TER-001", name: "Termômetro Digital Incoterm", type: "Termômetro", manufacturer: "Incoterm", model: "ITTL-300", serial: "INC-991021", location: "Sala de Análises", responsible: "Mariana Técnica", status: "Ativo", needsCalibration: true, periodicity: "6 meses", lastCal: "2025-09-10", nextCal: "2026-03-10" },
  { id: "EQ-004", code: "EST-001", name: "Estufa de Secagem", type: "Estufa", manufacturer: "Quimis", model: "Q-317B", serial: "QM-887763", location: "Sala de Preparo", responsible: "Mariana Técnica", status: "Ativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2024-11-20", nextCal: "2025-11-20" },
  { id: "EQ-005", code: "PHM-001", name: "pHmetro de Bancada", type: "pHmetro", manufacturer: "Hanna", model: "HI-2210", serial: "HN-220034", location: "Bancada B", responsible: "Mariana Técnica", status: "Em manutenção", needsCalibration: true, periodicity: "6 meses", lastCal: "2025-04-15", nextCal: "2025-10-15" },
  { id: "EQ-006", code: "CON-001", name: "Condutivímetro Digital", type: "Condutivímetro", manufacturer: "Tecnal", model: "TEC-4MP", serial: "TC-115589", location: "Bancada B", responsible: "Mariana Técnica", status: "Ativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2025-07-22", nextCal: "2026-07-22" },
  { id: "EQ-007", code: "ESP-001", name: "Espectrofotômetro UV-VIS", type: "Espectrofotômetro", manufacturer: "Thermo Fisher", model: "Genesys 10S", serial: "TF-882214", location: "Sala de Análises", responsible: "Paulo Auditor", status: "Ativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2025-02-18", nextCal: "2026-02-18" },
  { id: "EQ-008", code: "AUT-001", name: "Autoclave Vertical", type: "Autoclave", manufacturer: "Phoenix", model: "AV-75", serial: "PX-447702", location: "Sala de Esterilização", responsible: "Mariana Técnica", status: "Ativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2025-08-05", nextCal: "2026-08-05" },
  { id: "EQ-009", code: "REF-001", name: "Refrigerador Científico", type: "Refrigerador", manufacturer: "Indrel", model: "RC-410D", serial: "IN-660081", location: "Almoxarifado", responsible: "Roberto Gestor", status: "Ativo", needsCalibration: true, periodicity: "6 meses", lastCal: "2025-09-01", nextCal: "2026-03-01" },
  { id: "EQ-010", code: "MUF-001", name: "Mufla 1100°C", type: "Mufla", manufacturer: "Quimis", model: "Q-318M24", serial: "QM-991188", location: "Sala de Análises", responsible: "Mariana Técnica", status: "Inativo", needsCalibration: true, periodicity: "12 meses", lastCal: "2024-06-12", nextCal: "2025-06-12" },
];

export const calibrations = [
  { id: "CAL-001", equipment: "BAL-001 — Balança Analítica", date: "2025-03-12", validity: "2026-03-12", lab: "INMETRO", certificate: "CERT-2025-0214", result: "Aprovado", uncertainty: "± 0,0001 g", status: "Válida", responsible: "Roberto Gestor" },
  { id: "CAL-002", equipment: "PIP-001 — Pipeta Volumétrica", date: "2025-06-01", validity: "2026-06-01", lab: "MetroLab", certificate: "ML-2025-118", result: "Aprovado", uncertainty: "± 0,02 mL", status: "Válida", responsible: "Roberto Gestor" },
  { id: "CAL-003", equipment: "TER-001 — Termômetro", date: "2025-09-10", validity: "2026-03-10", lab: "INMETRO", certificate: "CERT-2025-0991", result: "Aprovado", uncertainty: "± 0,1 °C", status: "Próxima do vencimento", responsible: "Mariana Técnica" },
  { id: "CAL-004", equipment: "EST-001 — Estufa", date: "2024-11-20", validity: "2025-11-20", lab: "TermoCal", certificate: "TC-2024-405", result: "Aprovado", uncertainty: "± 0,5 °C", status: "Vencida", responsible: "Roberto Gestor" },
  { id: "CAL-005", equipment: "PHM-001 — pHmetro", date: "2025-04-15", validity: "2025-10-15", lab: "MetroLab", certificate: "ML-2025-077", result: "Com restrição", uncertainty: "± 0,02 pH", status: "Vencida", responsible: "Mariana Técnica" },
  { id: "CAL-006", equipment: "CON-001 — Condutivímetro", date: "2025-07-22", validity: "2026-07-22", lab: "INMETRO", certificate: "CERT-2025-0641", result: "Aprovado", uncertainty: "± 0,3 µS/cm", status: "Válida", responsible: "Mariana Técnica" },
  { id: "CAL-007", equipment: "ESP-001 — Espectrofotômetro", date: "2025-02-18", validity: "2026-02-18", lab: "OpticCal", certificate: "OC-2025-022", result: "Aprovado", uncertainty: "± 0,5 nm", status: "Próxima do vencimento", responsible: "Paulo Auditor" },
  { id: "CAL-008", equipment: "AUT-001 — Autoclave", date: "2025-08-05", validity: "2026-08-05", lab: "TermoCal", certificate: "TC-2025-220", result: "Aprovado", uncertainty: "± 1 °C", status: "Válida", responsible: "Mariana Técnica" },
  { id: "CAL-009", equipment: "REF-001 — Refrigerador", date: "2025-09-01", validity: "2026-03-01", lab: "TermoCal", certificate: "TC-2025-298", result: "Aprovado", uncertainty: "± 0,5 °C", status: "Próxima do vencimento", responsible: "Roberto Gestor" },
  { id: "CAL-010", equipment: "MUF-001 — Mufla", date: "2024-06-12", validity: "2025-06-12", lab: "TermoCal", certificate: "TC-2024-180", result: "Reprovado", uncertainty: "± 5 °C", status: "Reprovada", responsible: "Mariana Técnica" },
  { id: "CAL-011", equipment: "BAL-001 — Balança Analítica (interna)", date: "2025-09-15", validity: "2026-03-15", lab: "Interna", certificate: "INT-2025-009", result: "Aprovado", uncertainty: "± 0,0002 g", status: "Próxima do vencimento", responsible: "Roberto Gestor" },
  { id: "CAL-012", equipment: "PIP-001 — Verificação Intermediária", date: "2025-12-01", validity: "2026-06-01", lab: "Interna", certificate: "INT-2025-014", result: "Aprovado", uncertainty: "± 0,03 mL", status: "Válida", responsible: "Mariana Técnica" },
  { id: "CAL-013", equipment: "TER-001 — Verificação Anual", date: "2025-03-15", validity: "2026-09-15", lab: "MetroLab", certificate: "ML-2025-040", result: "Aprovado", uncertainty: "± 0,1 °C", status: "Válida", responsible: "Mariana Técnica" },
  { id: "CAL-014", equipment: "ESP-001 — Verificação Comprimento de Onda", date: "2025-08-20", validity: "2026-02-20", lab: "OpticCal", certificate: "OC-2025-211", result: "Aprovado", uncertainty: "± 0,3 nm", status: "Próxima do vencimento", responsible: "Paulo Auditor" },
  { id: "CAL-015", equipment: "PHM-001 — Recalibração", date: "2025-10-30", validity: "2026-04-30", lab: "MetroLab", certificate: "ML-2025-301", result: "Aprovado", uncertainty: "± 0,01 pH", status: "Válida", responsible: "Mariana Técnica" },
];

export const suppliers = [
  { id: "FOR-001", name: "QuímicaFina Reagentes Ltda", cnpj: "12.345.678/0001-90", contact: "Lucas Pereira", email: "vendas@quimicafina.com.br", phone: "(11) 4002-8922", type: "Reagentes", services: "Reagentes analíticos PA", status: "Ativo", classification: "Aprovado" },
  { id: "FOR-002", name: "MetroLab Calibrações", cnpj: "23.456.789/0001-12", contact: "Ana Souza", email: "contato@metrolab.com.br", phone: "(11) 3344-5566", type: "Calibração", services: "Calibração rastreável RBC", status: "Ativo", classification: "Aprovado" },
  { id: "FOR-003", name: "VidroLab Vidrarias", cnpj: "34.567.890/0001-34", contact: "Marcos Lima", email: "marcos@vidrolab.com.br", phone: "(11) 2233-4455", type: "Vidraria", services: "Vidraria volumétrica calibrada", status: "Ativo", classification: "Aprovado" },
  { id: "FOR-004", name: "EquipTech Manutenção", cnpj: "45.678.901/0001-56", contact: "Patrícia Rocha", email: "atendimento@equiptech.com.br", phone: "(11) 5566-7788", type: "Manutenção", services: "Manutenção preventiva e corretiva", status: "Em avaliação", classification: "Aprovado com restrição" },
  { id: "FOR-005", name: "BioMed Insumos", cnpj: "56.789.012/0001-78", contact: "Felipe Castro", email: "felipe@biomed.com.br", phone: "(11) 6677-8899", type: "Insumos", services: "Materiais de consumo laboratorial", status: "Ativo", classification: "Aprovado" },
  { id: "FOR-006", name: "PadrõesMetrológicos S/A", cnpj: "67.890.123/0001-99", contact: "Renata Dias", email: "renata@padroes.com.br", phone: "(11) 7788-9900", type: "Padrões", services: "Materiais de referência certificados", status: "Ativo", classification: "Aprovado" },
  { id: "FOR-007", name: "GasIndustrial Brasil", cnpj: "78.901.234/0001-11", contact: "Eduardo Ramos", email: "eduardo@gasind.com.br", phone: "(11) 8899-0011", type: "Gases", services: "Gases de alta pureza", status: "Suspenso", classification: "Reprovado" },
  { id: "FOR-008", name: "TI-Lab Sistemas", cnpj: "89.012.345/0001-22", contact: "Camila Nogueira", email: "camila@tilab.com.br", phone: "(11) 9900-1122", type: "Software", services: "Software LIMS e suporte", status: "Ativo", classification: "Aprovado" },
];

export const occurrences = [
  { id: "OC-001", type: "Não conformidade", origin: "Calibração", description: "Calibração da Mufla MUF-001 vencida há 60 dias", date: "2025-08-15", responsible: "Roberto Gestor", severity: "Alta", status: "Em tratamento" },
  { id: "OC-002", type: "Reclamação", origin: "Cliente", description: "Atraso na entrega de relatório de ensaio #4521", date: "2025-09-02", responsible: "Carla Administradora", severity: "Média", status: "Concluída" },
  { id: "OC-003", type: "Não conformidade", origin: "Auditoria", description: "POP-007 desatualizado em uso na bancada", date: "2025-09-10", responsible: "Roberto Gestor", severity: "Alta", status: "Em análise" },
  { id: "OC-004", type: "Oportunidade de melhoria", origin: "Processo interno", description: "Implementar QR code de rastreabilidade nas amostras", date: "2025-09-18", responsible: "Mariana Técnica", severity: "Baixa", status: "Aberta" },
  { id: "OC-005", type: "Desvio", origin: "Equipamento", description: "Variação de temperatura fora da faixa na Estufa EST-001", date: "2025-09-25", responsible: "Mariana Técnica", severity: "Média", status: "Em tratamento" },
  { id: "OC-006", type: "Não conformidade", origin: "Fornecedor", description: "Reagente recebido sem certificado de análise", date: "2025-10-01", responsible: "Roberto Gestor", severity: "Alta", status: "Aguardando validação" },
  { id: "OC-007", type: "Ocorrência", origin: "Processo interno", description: "Quebra de pipeta volumétrica durante uso", date: "2025-10-08", responsible: "Mariana Técnica", severity: "Baixa", status: "Concluída" },
  { id: "OC-008", type: "Não conformidade", origin: "Auditoria", description: "Treinamento de novo colaborador não registrado", date: "2025-10-12", responsible: "Roberto Gestor", severity: "Média", status: "Em tratamento" },
  { id: "OC-009", type: "Reclamação", origin: "Cliente", description: "Resultado divergente em análise repetida", date: "2025-10-20", responsible: "Paulo Auditor", severity: "Alta", status: "Em análise" },
  { id: "OC-010", type: "Oportunidade de melhoria", origin: "Processo interno", description: "Digitalização de registros físicos antigos", date: "2025-10-28", responsible: "Carla Administradora", severity: "Baixa", status: "Aberta" },
  { id: "OC-011", type: "Desvio", origin: "Equipamento", description: "pHmetro com leitura instável", date: "2025-11-03", responsible: "Mariana Técnica", severity: "Média", status: "Em tratamento" },
  { id: "OC-012", type: "Não conformidade", origin: "Fornecedor", description: "Atraso de entrega de gases industriais", date: "2025-11-10", responsible: "Roberto Gestor", severity: "Alta", status: "Aberta" },
];

export const risks = [
  { id: "RIS-001", process: "Calibração", description: "Atraso em calibração crítica", cause: "Falha no controle de prazos", consequence: "Resultado não rastreável", probability: 4, impact: 5, level: 20, classification: "Crítico", responsible: "Roberto Gestor", status: "Em tratamento" },
  { id: "RIS-002", process: "Análises", description: "Contaminação cruzada de amostras", cause: "Limpeza inadequada", consequence: "Resultado falso positivo", probability: 3, impact: 5, level: 15, classification: "Alto", responsible: "Mariana Técnica", status: "Em tratamento" },
  { id: "RIS-003", process: "Documental", description: "Uso de POP obsoleto", cause: "Falha na distribuição", consequence: "Procedimento incorreto", probability: 3, impact: 4, level: 12, classification: "Alto", responsible: "Roberto Gestor", status: "Monitorado" },
  { id: "RIS-004", process: "Pessoal", description: "Treinamento desatualizado", cause: "Falta de matriz de competências", consequence: "Erro operacional", probability: 3, impact: 3, level: 9, classification: "Médio", responsible: "Carla Administradora", status: "Em tratamento" },
  { id: "RIS-005", process: "Compras", description: "Reagente fora da especificação", cause: "Avaliação de fornecedor falha", consequence: "Resultado comprometido", probability: 2, impact: 5, level: 10, classification: "Alto", responsible: "Roberto Gestor", status: "Identificado" },
  { id: "RIS-006", process: "Equipamentos", description: "Falha de equipamento crítico", cause: "Manutenção preventiva tardia", consequence: "Interrupção operacional", probability: 3, impact: 4, level: 12, classification: "Alto", responsible: "Mariana Técnica", status: "Monitorado" },
  { id: "RIS-007", process: "TI", description: "Perda de registros eletrônicos", cause: "Falta de backup", consequence: "Perda de rastreabilidade", probability: 2, impact: 5, level: 10, classification: "Alto", responsible: "Carla Administradora", status: "Em tratamento" },
  { id: "RIS-008", process: "Imparcialidade", description: "Conflito de interesses", cause: "Vínculo com cliente", consequence: "Perda de credibilidade", probability: 1, impact: 5, level: 5, classification: "Médio", responsible: "Carla Administradora", status: "Monitorado" },
  { id: "RIS-009", process: "Análises", description: "Erro de transcrição de resultado", cause: "Anotação manual", consequence: "Relatório incorreto", probability: 3, impact: 3, level: 9, classification: "Médio", responsible: "Mariana Técnica", status: "Em tratamento" },
  { id: "RIS-010", process: "Ambiente", description: "Variação ambiental fora da especificação", cause: "Falha de ar-condicionado", consequence: "Influência em resultados", probability: 2, impact: 3, level: 6, classification: "Médio", responsible: "Mariana Técnica", status: "Monitorado" },
];

export const actionPlans = [
  { id: "AP-001", origin: "OC-001", description: "Recalibrar Mufla MUF-001 com fornecedor RBC", responsible: "Roberto Gestor", deadline: "2025-12-15", priority: "Alta", status: "Em andamento", progress: 60 },
  { id: "AP-002", origin: "OC-003", description: "Recolher cópias obsoletas do POP-007 das bancadas", responsible: "Mariana Técnica", deadline: "2025-11-20", priority: "Alta", status: "Concluído", progress: 100 },
  { id: "AP-003", origin: "RIS-001", description: "Implementar painel de prazos de calibração com alertas automáticos", responsible: "Carla Administradora", deadline: "2026-01-10", priority: "Alta", status: "Em andamento", progress: 30 },
  { id: "AP-004", origin: "OC-005", description: "Manutenção corretiva da Estufa EST-001", responsible: "Mariana Técnica", deadline: "2025-11-25", priority: "Média", status: "Aguardando validação", progress: 90 },
  { id: "AP-005", origin: "OC-006", description: "Devolver reagente sem certificado e bloquear lote", responsible: "Roberto Gestor", deadline: "2025-10-15", priority: "Alta", status: "Concluído", progress: 100 },
  { id: "AP-006", origin: "OC-008", description: "Registrar treinamento do colaborador em sistema", responsible: "Carla Administradora", deadline: "2025-11-05", priority: "Média", status: "Concluído", progress: 100 },
  { id: "AP-007", origin: "RIS-002", description: "Revisar POP de limpeza de bancada e treinar equipe", responsible: "Mariana Técnica", deadline: "2025-12-30", priority: "Alta", status: "Em andamento", progress: 45 },
  { id: "AP-008", origin: "OC-009", description: "Investigar causa de divergência em análise repetida", responsible: "Paulo Auditor", deadline: "2025-11-30", priority: "Alta", status: "Pendente", progress: 10 },
  { id: "AP-009", origin: "RIS-007", description: "Configurar rotina de backup automático diário", responsible: "Carla Administradora", deadline: "2025-12-20", priority: "Alta", status: "Em andamento", progress: 50 },
  { id: "AP-010", origin: "OC-011", description: "Substituir eletrodo do pHmetro PHM-001", responsible: "Mariana Técnica", deadline: "2025-11-18", priority: "Média", status: "Atrasado", progress: 20 },
  { id: "AP-011", origin: "AUD-002", description: "Atualizar matriz de competências da equipe técnica", responsible: "Roberto Gestor", deadline: "2025-12-10", priority: "Média", status: "Em andamento", progress: 40 },
  { id: "AP-012", origin: "RIS-005", description: "Reavaliar fornecedor QuímicaFina", responsible: "Roberto Gestor", deadline: "2026-01-20", priority: "Média", status: "Pendente", progress: 0 },
  { id: "AP-013", origin: "OC-012", description: "Negociar contrato alternativo de gases", responsible: "Carla Administradora", deadline: "2025-12-05", priority: "Alta", status: "Em andamento", progress: 25 },
  { id: "AP-014", origin: "AUD-001", description: "Revisar política de imparcialidade", responsible: "Carla Administradora", deadline: "2026-02-01", priority: "Baixa", status: "Pendente", progress: 0 },
  { id: "AP-015", origin: "RIS-006", description: "Programar manutenção preventiva semestral dos equipamentos críticos", responsible: "Mariana Técnica", deadline: "2026-01-15", priority: "Alta", status: "Em andamento", progress: 35 },
];

export const audits = [
  { id: "AUD-001", type: "Interna", scope: "Sistema de Gestão da Qualidade — ISO 17025", planned: "2025-09-15", performed: "2025-09-18", auditor: "Paulo Auditor", area: "Qualidade", status: "Concluída", findings: 4 },
  { id: "AUD-002", type: "Interna", scope: "Processos técnicos de análises físico-químicas", planned: "2025-10-05", performed: "2025-10-08", auditor: "Paulo Auditor", area: "Laboratório", status: "Concluída", findings: 3 },
  { id: "AUD-003", type: "Externa", scope: "Acreditação CGCRE — INMETRO", planned: "2025-11-20", performed: "—", auditor: "Equipe INMETRO", area: "Geral", status: "Em andamento", findings: 0 },
  { id: "AUD-004", type: "Interna", scope: "Gestão documental e controle de registros", planned: "2025-12-10", performed: "—", auditor: "Roberto Gestor", area: "Documental", status: "Planejada", findings: 0 },
  { id: "AUD-005", type: "Interna", scope: "Gestão de fornecedores e compras", planned: "2026-01-15", performed: "—", auditor: "Paulo Auditor", area: "Compras", status: "Planejada", findings: 0 },
];

export const competencies = [
  { id: "COMP-001", collaborator: "Mariana Técnica", role: "Técnica de Laboratório", competence: "Operação de Balança Analítica", training: "Curso interno BAL-001", date: "2025-03-20", validity: "2027-03-20", status: "Competente" },
  { id: "COMP-002", collaborator: "Mariana Técnica", role: "Técnica de Laboratório", competence: "Calibração de Pipetas", training: "Workshop Eppendorf", date: "2025-05-12", validity: "2026-05-12", status: "Competente" },
  { id: "COMP-003", collaborator: "Roberto Gestor", role: "Gestor da Qualidade", competence: "Auditor Líder ISO 17025", training: "Curso ABNT", date: "2024-09-15", validity: "2026-09-15", status: "Competente" },
  { id: "COMP-004", collaborator: "Paulo Auditor", role: "Auditor Interno", competence: "Auditoria Interna ISO 17025", training: "Curso BSI", date: "2024-06-10", validity: "2025-12-10", status: "Pendente" },
  { id: "COMP-005", collaborator: "Carla Administradora", role: "Administradora", competence: "Gestão da Qualidade", training: "MBA Qualidade", date: "2023-11-20", validity: "2026-11-20", status: "Competente" },
  { id: "COMP-006", collaborator: "Mariana Técnica", role: "Técnica de Laboratório", competence: "Operação de Espectrofotômetro", training: "Treinamento Thermo Fisher", date: "2024-08-22", validity: "2025-08-22", status: "Vencido" },
  { id: "COMP-007", collaborator: "Roberto Gestor", role: "Gestor da Qualidade", competence: "Análise Crítica pela Direção", training: "Workshop interno", date: "2025-02-05", validity: "2027-02-05", status: "Competente" },
  { id: "COMP-008", collaborator: "Paulo Auditor", role: "Auditor Interno", competence: "Validação de Métodos", training: "Curso INMETRO", date: "2025-04-18", validity: "2027-04-18", status: "Competente" },
  { id: "COMP-009", collaborator: "João Estagiário", role: "Estagiário", competence: "Boas Práticas Laboratoriais", training: "Treinamento de integração", date: "2025-10-01", validity: "2026-10-01", status: "Em treinamento" },
  { id: "COMP-010", collaborator: "Mariana Técnica", role: "Técnica de Laboratório", competence: "Análise de pH e Condutividade", training: "Curso Hanna", date: "2024-12-10", validity: "2026-12-10", status: "Competente" },
];

export const meetings = [
  { id: "RU-001", type: "Análise Crítica pela Direção", date: "2025-09-25", participants: ["Carla Administradora", "Roberto Gestor", "Paulo Auditor"], agenda: "Revisão dos indicadores anuais, status de auditorias, ações corretivas em aberto", status: "Realizada" },
  { id: "RU-002", type: "Reunião de Equipe Técnica", date: "2025-10-10", participants: ["Roberto Gestor", "Mariana Técnica", "Paulo Auditor"], agenda: "Revisão dos POPs atualizados e novos métodos analíticos", status: "Realizada" },
  { id: "RU-003", type: "Comitê de Riscos", date: "2025-11-08", participants: ["Carla Administradora", "Roberto Gestor"], agenda: "Reavaliação da matriz de riscos e tratamento dos riscos críticos", status: "Realizada" },
  { id: "RU-004", type: "Análise Crítica de Resultados", date: "2025-12-05", participants: ["Roberto Gestor", "Mariana Técnica"], agenda: "Análise de não conformidades trimestrais e ações", status: "Agendada" },
  { id: "RU-005", type: "Reunião de Pré-Auditoria Externa", date: "2025-11-15", participants: ["Carla Administradora", "Roberto Gestor", "Paulo Auditor", "Mariana Técnica"], agenda: "Preparação para auditoria INMETRO", status: "Agendada" },
];

export const processMaps = [
  { id: "PROC-001", name: "Recebimento de Amostras", owner: "Mariana Técnica", objective: "Garantir rastreabilidade desde a chegada da amostra", inputs: "Amostra do cliente, formulário de solicitação", outputs: "Amostra identificada e registrada", status: "Ativo", risks: 2, docs: 4 },
  { id: "PROC-002", name: "Análises Físico-Químicas", owner: "Roberto Gestor", objective: "Executar análises conforme métodos validados", inputs: "Amostra, POP, equipamento calibrado", outputs: "Resultado analítico rastreável", status: "Ativo", risks: 4, docs: 8 },
  { id: "PROC-003", name: "Emissão de Relatórios", owner: "Carla Administradora", objective: "Emitir relatórios conforme requisitos do cliente", inputs: "Resultados validados", outputs: "Relatório de ensaio assinado", status: "Ativo", risks: 2, docs: 3 },
  { id: "PROC-004", name: "Gestão de Equipamentos", owner: "Mariana Técnica", objective: "Garantir equipamentos calibrados e em condições de uso", inputs: "Cronograma de calibração", outputs: "Equipamento liberado para uso", status: "Ativo", risks: 3, docs: 5 },
  { id: "PROC-005", name: "Gestão de Fornecedores", owner: "Roberto Gestor", objective: "Selecionar e avaliar fornecedores críticos", inputs: "Necessidades do laboratório", outputs: "Fornecedor qualificado", status: "Ativo", risks: 2, docs: 4 },
  { id: "PROC-006", name: "Gestão de Pessoas", owner: "Carla Administradora", objective: "Garantir competência técnica da equipe", inputs: "Matriz de competências", outputs: "Equipe treinada e qualificada", status: "Ativo", risks: 1, docs: 3 },
];

export const forms = [
  { id: "FORM-001", name: "Inspeção Diária de Equipamentos", responsible: "Mariana Técnica", periodicity: "Diária", fields: 8, responses: 142, lastResponse: "2025-11-09" },
  { id: "FORM-002", name: "Registro de Temperatura — Refrigerador", responsible: "Mariana Técnica", periodicity: "Diária", fields: 5, responses: 287, lastResponse: "2025-11-10" },
  { id: "FORM-003", name: "Recebimento de Reagentes", responsible: "Roberto Gestor", periodicity: "Por evento", fields: 12, responses: 38, lastResponse: "2025-11-08" },
  { id: "FORM-004", name: "Avaliação Pós-Treinamento", responsible: "Carla Administradora", periodicity: "Por evento", fields: 10, responses: 24, lastResponse: "2025-10-30" },
  { id: "FORM-005", name: "Verificação Intermediária de Pipeta", responsible: "Mariana Técnica", periodicity: "Mensal", fields: 9, responses: 22, lastResponse: "2025-11-01" },
];

export const purchases = [
  { id: "PC-001", supplier: "QuímicaFina Reagentes Ltda", item: "Ácido Sulfúrico PA — 1L", justification: "Reposição estoque mínimo", value: "R$ 480,00", date: "2025-10-12", responsible: "Roberto Gestor", status: "Recebido" },
  { id: "PC-002", supplier: "MetroLab Calibrações", item: "Calibração anual de balança", justification: "Cronograma de calibração 2025", value: "R$ 1.200,00", date: "2025-09-20", responsible: "Roberto Gestor", status: "Inspecionado" },
  { id: "PC-003", supplier: "VidroLab Vidrarias", item: "Conjunto de pipetas volumétricas", justification: "Substituição por quebra", value: "R$ 2.100,00", date: "2025-10-25", responsible: "Mariana Técnica", status: "Aprovado" },
  { id: "PC-004", supplier: "PadrõesMetrológicos S/A", item: "Material de Referência Certificado — pH", justification: "Validação de método", value: "R$ 890,00", date: "2025-11-02", responsible: "Roberto Gestor", status: "Em cotação" },
  { id: "PC-005", supplier: "BioMed Insumos", item: "Luvas nitrílicas — caixa 100un", justification: "Reposição EPI", value: "R$ 320,00", date: "2025-11-05", responsible: "Mariana Técnica", status: "Solicitado" },
];

export const auditLogs = [
  { id: 1, datetime: "2025-11-10 09:14:22", user: "Roberto Gestor", action: "Aprovou documento", module: "Documentos", record: "DOC-002", before: "Em revisão", after: "Aprovado" },
  { id: 2, datetime: "2025-11-10 10:02:55", user: "Mariana Técnica", action: "Registrou calibração", module: "Calibrações", record: "CAL-015", before: "—", after: "Aprovado" },
  { id: 3, datetime: "2025-11-10 11:30:18", user: "Carla Administradora", action: "Criou usuário", module: "Usuários", record: "user@qualilab.com", before: "—", after: "Ativo" },
  { id: 4, datetime: "2025-11-09 16:45:09", user: "Roberto Gestor", action: "Abriu não conformidade", module: "Ocorrências", record: "OC-012", before: "—", after: "Aberta" },
  { id: 5, datetime: "2025-11-09 14:20:44", user: "Paulo Auditor", action: "Concluiu auditoria interna", module: "Auditorias", record: "AUD-002", before: "Em andamento", after: "Concluída" },
  { id: 6, datetime: "2025-11-08 08:55:12", user: "Mariana Técnica", action: "Atualizou plano de ação", module: "Planos de Ação", record: "AP-007", before: "30%", after: "45%" },
  { id: 7, datetime: "2025-11-07 17:11:38", user: "Roberto Gestor", action: "Reprovou fornecedor", module: "Fornecedores", record: "FOR-007", before: "Suspenso", after: "Reprovado" },
  { id: 8, datetime: "2025-11-07 15:08:01", user: "Carla Administradora", action: "Registrou reunião", module: "Reuniões", record: "RU-003", before: "—", after: "Realizada" },
];

export const occurrencesByMonth = [
  { month: "Mai", value: 5 },
  { month: "Jun", value: 7 },
  { month: "Jul", value: 4 },
  { month: "Ago", value: 9 },
  { month: "Set", value: 11 },
  { month: "Out", value: 8 },
  { month: "Nov", value: 6 },
];
