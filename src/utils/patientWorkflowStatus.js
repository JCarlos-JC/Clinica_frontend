const normalizeWorkflowStatus = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\s-]+/g, '_');

const STATUS_DEFINITIONS = {
  pagamento_pendente: { key: 'pagamento_pendente', label: 'Pagamento Pendente', color: '#fa8c16', stage: 10, active: false, terminal: false },
  aguardando_triagem: { key: 'aguardando_triagem', label: 'Aguardando Triagem', color: '#1890ff', stage: 20, active: true, terminal: false },
  em_triagem: { key: 'em_triagem', label: 'Em Triagem', color: '#13c2c2', stage: 30, active: true, terminal: false },
  triagem_concluida: { key: 'triagem_concluida', label: 'Triagem Concluída', color: '#52c41a', stage: 40, active: true, terminal: false },
  aguardando_consulta: { key: 'aguardando_consulta', label: 'Aguardando Consulta', color: '#1677ff', stage: 50, active: true, terminal: false },
  em_consulta: { key: 'em_consulta', label: 'Em Consulta', color: '#52c41a', stage: 60, active: true, terminal: false },
  aguardando_prescricao: { key: 'aguardando_prescricao', label: 'Aguardando Prescrição', color: '#13c2c2', stage: 65, active: true, terminal: false },
  aguardando_exames: { key: 'aguardando_exames', label: 'Aguardando Exames', color: '#fa8c16', stage: 70, active: true, terminal: false },
  retorno_exames: { key: 'retorno_exames', label: 'Retorno com Exames', color: '#722ed1', stage: 75, active: true, terminal: false },
  transferido_medico: { key: 'transferido_medico', label: 'Transferido para Outro Médico', color: '#722ed1', stage: 80, active: true, terminal: false },
  transferido_especialidade: { key: 'transferido_especialidade', label: 'Transferido para Especialidade', color: '#eb2f96', stage: 82, active: false, terminal: true },
  aguardando_pagamento_especialidade: { key: 'aguardando_pagamento_especialidade', label: 'Aguardando Pagamento da Especialidade', color: '#fa8c16', stage: 83, active: false, terminal: false },
  transferido_hospital: { key: 'transferido_hospital', label: 'Transferido para Hospital', color: '#fa541c', stage: 84, active: false, terminal: true },
  finalizada: { key: 'finalizada', label: 'Consulta Finalizada', color: '#52c41a', stage: 90, active: false, terminal: true },
  alta: { key: 'alta', label: 'Alta Clínica', color: '#52c41a', stage: 91, active: false, terminal: true },
  obito: { key: 'obito', label: 'Óbito', color: '#595959', stage: 92, active: false, terminal: true },
  cancelada: { key: 'cancelada', label: 'Cancelado', color: '#ff4d4f', stage: 93, active: false, terminal: true },
  disponivel: { key: 'disponivel', label: 'Disponível', color: '#52c41a', stage: 100, active: false, terminal: false },
  bloqueado: { key: 'bloqueado', label: 'Aguardar', color: '#ff4d4f', stage: 101, active: false, terminal: false },
};

const STATUS_ALIASES = {
  pendente: 'aguardando_triagem',
  pending: 'aguardando_triagem',
  aguardando: 'aguardando_triagem',
  aguardando_triagem: 'aguardando_triagem',
  solicitada: 'aguardando_triagem',
  solicitado: 'aguardando_triagem',
  solicitacao_triagem: 'aguardando_triagem',
  em_triagem: 'em_triagem',
  triagem: 'em_triagem',
  triagem_concluida: 'triagem_concluida',
  concluida_triagem: 'triagem_concluida',
  consulta_agendada: 'aguardando_consulta',
  agendada: 'aguardando_consulta',
  agendado: 'aguardando_consulta',
  confirmada: 'aguardando_consulta',
  confirmado: 'aguardando_consulta',
  aguardando_consulta: 'aguardando_consulta',
  em_consulta: 'em_consulta',
  em_atendimento: 'em_consulta',
  atendimento: 'em_consulta',
  aguardando_prescricao: 'aguardando_prescricao',
  aguardando_exames: 'aguardando_exames',
  finalizada_com_exames: 'aguardando_exames',
  em_laboratorio: 'aguardando_exames',
  pago_laboratorio: 'aguardando_exames',
  exames_concluidos: 'retorno_exames',
  retorno_exames: 'retorno_exames',
  retorno_com_exames: 'retorno_exames',
  com_exames: 'retorno_exames',
  transferido: 'transferido_hospital',
  transferida: 'transferido_hospital',
  transferencia: 'transferido_hospital',
  transferencia_hospitalar: 'transferido_hospital',
  transferido_hospital: 'transferido_hospital',
  transferencia_hospital: 'transferido_hospital',
  transferido_hospitalar: 'transferido_hospital',
  transferencia_entre_hospitais: 'transferido_hospital',
  paciente_faltou: 'cancelada',
  faltou: 'cancelada',
  entre_hospitais: 'transferido_hospital',
  transferido_medico: 'transferido_medico',
  medico_transferido: 'transferido_medico',
  entre_medicos: 'transferido_medico',
  transferido_especialidade: 'transferido_especialidade',
  transferencia_especialidade: 'transferido_especialidade',
  entre_especialidades: 'transferido_especialidade',
  aguardando_pagamento_especialidade: 'aguardando_pagamento_especialidade',
  finalizada: 'finalizada',
  finalizado: 'finalizada',
  concluida: 'finalizada',
  concluido: 'finalizada',
  alta: 'alta',
  obito: 'obito',
  cancelada: 'cancelada',
  cancelado: 'cancelada',
  pago: 'aguardando_triagem',
  paga: 'aguardando_triagem',
  ativo: 'disponivel',
  disponivel: 'disponivel',
};

const STATUS_FIELDS = [
  'status',
  'estado',
  'situacao',
  'status_consulta',
  'consulta_status',
  'statusConsulta',
  'status_atendimento',
  'status_agendamento',
  'agendamento_status',
  'statusSolicitacaoTriagem',
  'statusExames',
];

const getByPath = (object, path) => path.split('.').reduce((acc, key) => acc?.[key], object);

const resolveStatusKey = (value) => {
  const normalized = normalizeWorkflowStatus(value);
  return STATUS_ALIASES[normalized] || normalized || 'disponivel';
};

const buildWorkflowStatus = (key, fallbackLabel) => {
  const definition = STATUS_DEFINITIONS[key] || STATUS_DEFINITIONS.disponivel;
  return {
    ...definition,
    rawKey: key,
    label: STATUS_DEFINITIONS[key] ? definition.label : (fallbackLabel || definition.label),
    texto: STATUS_DEFINITIONS[key] ? definition.label : (fallbackLabel || definition.label),
    cor: definition.color,
    status: definition.key,
    desabilitado: definition.active || ['pagamento_pendente', 'bloqueado'].includes(definition.key),
  };
};

const getWorkflowStatus = (record = {}, options = {}) => {
  if (options.forceKey) {
    return buildWorkflowStatus(options.forceKey, options.label);
  }

  if (record?.aguardandoExames || record?.examesEmAndamento || record?.statusExames === 'pendente') {
    return buildWorkflowStatus('aguardando_exames');
  }

  if (record?.retornoComExames || record?.retornoConsulta || record?.resultadosExames) {
    return buildWorkflowStatus('retorno_exames');
  }

  if (record?.transferido_especialidade) {
    return buildWorkflowStatus('transferido_especialidade');
  }

  const values = [
    ...STATUS_FIELDS.map((field) => record?.[field]),
    record?.consulta?.status,
    record?.consulta?.estado,
    record?.agendamento?.status,
    record?.agendamento?.estado,
    record?.triagem?.status,
    record?.triagem?.estado,
  ].filter(Boolean);

  const ranked = values
    .map((value) => buildWorkflowStatus(resolveStatusKey(value), String(value)))
    .sort((a, b) => b.stage - a.stage);

  return ranked[0] || buildWorkflowStatus(record?.statusPagamentoConsulta === 'pago' ? 'disponivel' : 'pagamento_pendente');
};

const isWorkflowActive = (valueOrRecord) => {
  const status = typeof valueOrRecord === 'object'
    ? getWorkflowStatus(valueOrRecord)
    : buildWorkflowStatus(resolveStatusKey(valueOrRecord), String(valueOrRecord || ''));

  return status.active;
};

const isWorkflowTerminal = (valueOrRecord) => {
  const status = typeof valueOrRecord === 'object'
    ? getWorkflowStatus(valueOrRecord)
    : buildWorkflowStatus(resolveStatusKey(valueOrRecord), String(valueOrRecord || ''));

  return status.terminal;
};

const isOutOfConsultationQueue = (record = {}) => {
  const status = getWorkflowStatus(record);
  return status.terminal || ['aguardando_exames', 'retorno_exames', 'transferido_especialidade', 'aguardando_pagamento_especialidade', 'transferido_hospital'].includes(status.key);
};

export {
  STATUS_DEFINITIONS,
  normalizeWorkflowStatus,
  getWorkflowStatus,
  isWorkflowActive,
  isWorkflowTerminal,
  isOutOfConsultationQueue,
  getByPath,
};
