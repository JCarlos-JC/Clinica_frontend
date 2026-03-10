import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Modal, Form, Input, message, Tabs, Card, Tag, Space, Row, Col, Select, Upload, Divider, Badge, Tooltip } from 'antd';
import useLaboratorio from '../../hooks/useLaboratorio';
import {
  CheckCircleOutlined,
  UserOutlined,
  ExperimentOutlined,
  CheckSquareOutlined,
  EditOutlined,
  UploadOutlined,
  PaperClipOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const LaboratorioPaciente = () => {
  const {
    agendamentos,
    agendamentosHistorico,
    loading,
    loadingAcao,
    fetchAgendamentosPendentes,
    fetchHistorico,
    iniciarColheita,
    concluirColheita,
    adicionarAnexo
  } = useLaboratorio();

  // ID do agendamento que está a ser processado no modal
  const agendamentoEmProcessoId = useRef(null);

  const [isExameModalVisible, setIsExameModalVisible] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [resultadosExames, setResultadosExames] = useState({});
  const [formExames] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [arquivosExames, setArquivosExames] = useState({});

  // Carrega agendamentos ao montar o componente
  useEffect(() => {
    fetchAgendamentosPendentes();
  }, [fetchAgendamentosPendentes]);

  // Carrega histórico ao entrar na aba 2
  useEffect(() => {
    if (activeTab === '2') fetchHistorico();
  }, [activeTab, fetchHistorico]);
  
  // Configurações para diferentes tipos de exames
  const tiposExames = {
    "Hemograma Completo": {
      campos: ["Hemácias", "Hemoglobina", "Hematócrito", "Leucócitos Totais", "Plaquetas"]
    },
    "Glicemia": {
      campos: ["Glicose em Jejum"]
    },
    "Perfil Lipídico": {
      campos: ["Colesterol Total", "HDL", "LDL", "Triglicerídeos"]
    },
    "Função Renal": {
      campos: ["Ureia", "Creatinina"]
    },
    "Função Hepática": {
      campos: ["TGO/AST", "TGP/ALT", "Bilirrubina Total", "Bilirrubina Direta"]
    },
    "Tipagem Sanguínea": {
      campos: ["Grupo Sanguíneo", "Fator Rh"]
    },
    "Urina Tipo I": {
      campos: ["Aspecto", "Cor", "Densidade", "pH", "Proteínas", "Glicose", "Corpos Cetônicos", "Sangue"]
    },
    "Fezes": {
      campos: ["Parasitas", "Sangue Oculto"]
    },
    "Raio-X": {
      campos: ["Região Examinada", "Achados", "Conclusão"],
      requerArquivo: true
    },
    "Ultrassonografia": {
      campos: ["Região Examinada", "Achados", "Conclusão"],
      requerArquivo: true
    },
    "Eletrocardiograma": {
      campos: ["Frequência Cardíaca", "Ritmo", "Alterações", "Conclusão"],
      requerArquivo: true
    },
    "Outros": {
      campos: ["Resultados Gerais"],
      requerArquivo: false
    }
  };

  // Mapeamento de tipos de exame para campos de resultado
  // ─────────────────────────────────────────────────────

  /**
   * Abre o modal de colheita.
   * Se o agendamento ainda está em estado 'agendada', chama iniciarColheita antes.
   */
  const realizarExames = async (agendamento) => {
    agendamentoEmProcessoId.current = agendamento.id;

    const pacienteParaModal = {
      ...agendamento,
      // exames como array de objetos { id, tipo_exame, prioridade } para o modal
      exames: agendamento.exames || [],
      solicitadoPor: agendamento.medico_solicitante || agendamento.solicitadoPor,
      observacoes:   agendamento.observacoes
    };

    setPacienteSelecionado(pacienteParaModal);
    setResultadosExames({});
    formExames.resetFields();
    setIsExameModalVisible(true);

    // Marca colheita como em_colheita no backend (só se ainda estiver 'agendada')
    if (agendamento.status === 'agendada') {
      try {
        await iniciarColheita(agendamento.id, {});
      } catch (_) {
        // erro já tratado no hook — não bloqueia a abertura do modal
      }
    }
  };
  const handleFinishExames = async () => {
    if (Object.keys(resultadosExames).length === 0) {
      message.error('Por favor, adicione pelo menos um resultado de exame.');
      return;
    }

    const agendamentoId = agendamentoEmProcessoId.current;
    if (!agendamentoId) {
      message.error('Agendamento não identificado. Tente novamente.');
      return;
    }

    // Constrói o array de resultados para o backend
    const resultadosArray = Object.entries(resultadosExames).map(([tipoExame, resultado]) => {
      // Encontrar o exame_id correspondente ao tipo_exame no agendamento
      const exameObj = (pacienteSelecionado?.exames || []).find(
        e => (e.tipo_exame || e.nome) === tipoExame
      );
      return {
        exame_id:   exameObj?.id ?? null,
        tipo_exame: tipoExame,
        resultado:  resultado.valores ?? resultado,
        laudo:      '',
        arquivos:   (resultado.arquivos || []).map(f => f.name || f.uid)
      };
    });

    const payload = {
      hora_conclusao:    new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      observacoes_gerais: pacienteSelecionado?.observacoes || '',
      resultados:        resultadosArray
    };

    await concluirColheita(agendamentoId, payload, () => {
      setIsExameModalVisible(false);
      setPacienteSelecionado(null);
      setResultadosExames({});
      formExames.resetFields();
      agendamentoEmProcessoId.current = null;
    });

    // Upload de anexos (PDFs / imagens) se existirem
    for (const [tipoExame, arquivos] of Object.entries(arquivosExames)) {
      if (arquivos && arquivos.length > 0) {
        const exameObj = (pacienteSelecionado?.exames || []).find(
          e => (e.tipo_exame || e.nome) === tipoExame
        );
        for (const file of arquivos) {
          if (file.originFileObj) {
            const formData = new FormData();
            formData.append('ficheiro', file.originFileObj);
            if (exameObj?.id) formData.append('exame_id', exameObj.id);
            formData.append('descricao', tipoExame);
            try {
              await adicionarAnexo(agendamentoId, formData);
            } catch (_) {
              // falha no anexo não cancela o sucesso da colheita
            }
          }
        }
      }
    }
    setArquivosExames({});
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Adiciona resultado de um exame ao estado local do modal
  // ─────────────────────────────────────────────────────────────────────────
  const adicionarResultadoExame = () => {
    const tipoExame = formExames.getFieldValue('tipoExame');
    
    // Verificar se o tipo de exame existe
    if (!tipoExame || !tiposExames[tipoExame]) {
      message.error('Selecione um tipo de exame válido');
      return;
    }
    
    // Coletar os valores dos campos específicos deste tipo de exame
    const campos = tiposExames[tipoExame].campos;
    const resultados = {};
    
    // Verificar se todos os campos obrigatórios foram preenchidos
    let camposPreenchidos = true;
    campos.forEach(campo => {
      const valor = formExames.getFieldValue(`campo_${campo}`);
      if (!valor) {
        camposPreenchidos = false;
        message.warning(`O campo ${campo} é obrigatório`);
      }
      resultados[campo] = valor || '';
    });
    
    if (!camposPreenchidos) return;
    
    // Verificar se há arquivos se o exame os requer
    if (tiposExames[tipoExame].requerArquivo && (!arquivosExames[tipoExame] || arquivosExames[tipoExame].length === 0)) {
      message.warning('Este tipo de exame requer o upload de imagens ou documentos');
      return;
    }
    
    // Adicionar os resultados formatados ao estado
    const resultadoFormatado = {
      valores: resultados,
      arquivos: arquivosExames[tipoExame] || []
    };
    
    setResultadosExames({
      ...resultadosExames,
      [tipoExame]: resultadoFormatado
    });
    
    // Limpar o formulário após adicionar
    formExames.resetFields();
    
    // Limpar os arquivos associados a este exame
    setArquivosExames({
      ...arquivosExames,
      [tipoExame]: undefined
    });
    
    message.success(`Exame ${tipoExame} adicionado com sucesso`);
  };
  
  // Função para gerenciar upload de arquivos
  const handleFileUpload = (info, tipoExame) => {
    let fileList = [...info.fileList];
    
    // Limitar a 5 arquivos no máximo
    fileList = fileList.slice(-5);
    
    // Atualizar o estado com os arquivos
    setArquivosExames({
      ...arquivosExames,
      [tipoExame]: fileList
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COLUNAS DA TABELA — AGENDAMENTOS PENDENTES
  // ─────────────────────────────────────────────────────────────────────────
  const columnsExamesPendentes = [
    {
      title: 'NID',
      dataIndex: 'nid',
      key: 'nid',
      render: (nid) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{nid || 'N/A'}</span>
      )
    },
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    {
      title: 'Exames Solicitados',
      dataIndex: 'exames',
      key: 'exames',
      render: (exames) => (
        <div>
          {(exames || []).map((e, idx) => (
            <Tag
              key={idx}
              color={e.prioridade === 'urgente' ? 'red' : 'blue'}
              style={{ marginBottom: 4 }}
            >
              {e.tipo_exame || e.nome || e}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Prioridade',
      key: 'prioridade',
      render: (_, record) => {
        const temUrgente = (record.exames || []).some(e => e.prioridade === 'urgente');
        return (
          <Tag color={temUrgente ? 'red' : 'blue'}>
            {temUrgente ? 'Urgente' : 'Normal'}
          </Tag>
        );
      }
    },
    {
      title: 'Médico Solicitante',
      dataIndex: 'medico_solicitante',
      key: 'medico_solicitante',
      render: (v) => <Tag color="purple">{v || '—'}</Tag>
    },
    {
      title: 'Hora Colheita',
      dataIndex: 'hora_colheita',
      key: 'hora_colheita',
      render: (v, record) => (
        <span>
          {v || '—'}
          {record.observacoes && (
            <Tooltip title={record.observacoes}>
              <span style={{ color: '#faad14', marginLeft: 6 }}>ⓘ</span>
            </Tooltip>
          )}
        </span>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const map = {
          agendada:    { color: 'blue',   label: 'Agendada'    },
          em_colheita: { color: 'orange', label: 'Em Colheita' }
        };
        const cfg = map[status] || { color: 'default', label: status };
        return <Badge color={cfg.color} text={cfg.label} />;
      }
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<ExperimentOutlined />}
          loading={loadingAcao}
          onClick={() => realizarExames(record)}
        >
          {record.status === 'em_colheita' ? 'Continuar Colheita' : 'Realizar Exames'}
        </Button>
      )
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // COLUNAS DA TABELA — HISTÓRICO DE COLHEITAS CONCLUÍDAS
  // ─────────────────────────────────────────────────────────────────────────
  const columnsExamesConcluidos = [
    { title: 'NID', dataIndex: 'nid', key: 'nid' },
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    {
      title: 'Exames Realizados',
      key: 'examesRealizados',
      render: (_, record) => (
        <div>
          {record.resultadosExames && Object.entries(record.resultadosExames).map(([exame, resultado], idx) => (
            <div key={idx} style={{ marginBottom: '12px', border: '1px solid #eee', padding: '8px', borderRadius: '4px' }}>
              <strong>{typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}</strong>
              {resultado.valores ? (
                <div style={{ marginTop: '5px', paddingLeft: '10px' }}>
                  {Object.entries(resultado.valores).map(([campo, valor], i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#666' }}>
                      <strong>{campo}:</strong> {typeof valor === 'object' ? (valor.nome || JSON.stringify(valor)) : String(valor)}
                    </div>
                  ))}
                  
                  {resultado.arquivos && resultado.arquivos.length > 0 && (
                    <div style={{ marginTop: '5px', fontSize: '12px' }}>
                      <strong>Documentos:</strong> {resultado.arquivos.length} arquivo(s)
                      {resultado.arquivos.map((file, i) => (
                        <Tag key={i} color="blue" style={{ marginLeft: '5px', fontSize: '11px' }}>
                          <PaperClipOutlined /> {file.name || `Arquivo ${i+1}`}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: '5px', fontSize: '12px' }}>
                  <strong>Resultado:</strong> {resultado}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Data dos Exames',
      dataIndex: 'dataExames',
      key: 'dataExames',
      sorter: (a, b) => new Date(a.dataExames) - new Date(b.dataExames)
    }
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 1300, padding: 24 }}>
        <Card
          title="Laboratório — Colheitas e Resultados"
          style={{
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
            style={{ marginBottom: '24px' }}
          >
            {/* Aba 1: Exames Pendentes */}
            <TabPane
              tab={
                <span>
                  <ExperimentOutlined />
                  Colheitas Agendadas
                  {agendamentos?.length > 0 &&
                    <span style={{
                      backgroundColor: '#1890ff',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 8px',
                      fontSize: '12px',
                      marginLeft: '8px'
                    }}>
                      {agendamentos.length}
                    </span>
                  }
                </span>
              }
              key="1"
            >
              <h3>Colheitas Pendentes e Em Curso</h3>
              <Table
                columns={columnsExamesPendentes}
                dataSource={agendamentos}
                rowKey="id"
                loading={loading}
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há colheitas agendadas. As colheitas são criadas após o paciente pagar os exames na receção.' }}
              />
            </TabPane>

            {/* Aba 2: Exames Concluídos */}
            <TabPane
              tab={
                <span>
                  <CheckSquareOutlined />
                  Exames Concluídos
                </span>
              }
              key="2"
            >
              <h3>Histórico de Colheitas Concluídas</h3>
              <Table
                columns={columnsExamesConcluidos}
                dataSource={agendamentosHistorico}
                rowKey="id"
                loading={loading}
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há colheitas concluídas' }}
              />
            </TabPane>
          </Tabs>
        </Card>        {/* Modal de Exames */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ExperimentOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
              <span style={{ color: '#2d3a4a', fontWeight: 'bold', fontSize: '18px' }}>
                Realizar Exames — {pacienteSelecionado?.nome}
              </span>
            </div>
          }
          open={isExameModalVisible}
          onCancel={() => setIsExameModalVisible(false)}
          footer={null}
          width={900}
          destroyOnClose
          style={{ top: 20 }}
          bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
        >
          {/* Informações do Paciente */}
          <div style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <UserOutlined style={{ color: '#1890ff', marginRight: 8, fontSize: 16 }} />
                  <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 16 }}>
                    {pacienteSelecionado?.nome}
                  </span>
                </div>
                <div style={{ marginLeft: 24, color: '#555' }}>
                  <div><strong>NID:</strong> {pacienteSelecionado?.nid}</div>
                  {pacienteSelecionado?.data_colheita && (
                    <div><strong>Data Colheita:</strong> {dayjs(pacienteSelecionado.data_colheita).format('DD/MM/YYYY')}</div>
                  )}
                  {pacienteSelecionado?.hora_colheita && (
                    <div><strong>Hora:</strong> {pacienteSelecionado.hora_colheita}</div>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'right' }}>
                  {pacienteSelecionado?.prioridade && (
                    <Tag
                      color={
                        pacienteSelecionado.prioridade === 'Urgente' ? 'red' :
                          pacienteSelecionado.prioridade === 'Baixa' ? 'green' : 'blue'
                      }
                      style={{ fontSize: '14px', padding: '4px 8px', marginBottom: 8 }}
                    >
                      Prioridade: {pacienteSelecionado.prioridade}
                    </Tag>
                  )}
                  {pacienteSelecionado?.solicitadoPor && (
                    <div>
                      <Tag color="purple" style={{ fontSize: '14px', padding: '4px 8px' }}>
                        Solicitado por: {pacienteSelecionado.solicitadoPor}
                      </Tag>
                    </div>
                  )}
                  {pacienteSelecionado?.dataPagamento && (
                    <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                      <strong>Data Pagamento:</strong> {pacienteSelecionado.dataPagamento}
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>

          {/* Exames Solicitados */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}>
            <h4 style={{ color: '#0284c7', marginBottom: 12, fontSize: 16 }}>
              <ExperimentOutlined style={{ marginRight: 8 }} />
              Exames para Realizar:
            </h4>
            {pacienteSelecionado?.exames && Array.isArray(pacienteSelecionado.exames) && pacienteSelecionado.exames.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {pacienteSelecionado.exames.map((exame, index) => (
                  <Tag key={index} color="blue" style={{ fontSize: '13px', padding: '4px 8px' }}>
                    {exame.tipo_exame || exame.nome || String(exame)}
                    {exame.prioridade && exame.prioridade !== 'Normal' && (
                      <span style={{ marginLeft: 4, color: '#ff4d4f', fontWeight: 'bold' }}>
                        [{exame.prioridade}]
                      </span>
                    )}
                  </Tag>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', fontStyle: 'italic' }}>Nenhum exame listado</p>
            )}
          </div>

          {pacienteSelecionado?.observacoes && (
            <div style={{ 
              marginBottom: 20,
              backgroundColor: '#fff7e6', 
              border: '1px solid #ffd591',
              padding: 12, 
              borderRadius: 6 
            }}>
              <h4 style={{ color: '#d4621b', marginBottom: 8 }}>Observações:</h4>
              <p style={{ margin: 0, color: '#8c4a02' }}>{pacienteSelecionado.observacoes}</p>
            </div>
          )}          <Form form={formExames} layout="vertical">
            <div style={{
              background: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              padding: 20,
              marginBottom: 20
            }}>
              <h3 style={{ color: '#2d3a4a', marginBottom: 16, fontSize: 18 }}>
                <CheckSquareOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                Registrar Resultados dos Exames
              </h3>

              {/* Seleção do tipo de exame */}
              <Form.Item
                label="Tipo de Exame"
                name="tipoExame"
                rules={[{ required: true, message: 'Selecione o tipo de exame' }]}
              >
                <Select 
                  placeholder="Selecione o tipo de exame" 
                  style={{ width: '100%', borderRadius: 6 }}
                  onChange={(value) => {
                    formExames.resetFields(['resultado']);
                    // Limpar campos específicos se houver algum preenchido
                    if (value && tiposExames[value]) {
                      const campos = tiposExames[value].campos;
                      const resetObj = {};
                      campos.forEach(campo => {
                        resetObj[`campo_${campo}`] = undefined;
                      });
                      formExames.setFields(Object.keys(resetObj).map(key => ({ name: key, value: undefined })));
                    }
                  }}
                >
                  {Object.keys(tiposExames).map(tipo => (
                    <Select.Option key={tipo} value={tipo}>{tipo}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Campos dinâmicos baseados no tipo de exame selecionado */}
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.tipoExame !== currentValues.tipoExame}>
                {({ getFieldValue }) => {
                  const tipoExameSelecionado = getFieldValue('tipoExame');
                  
                  if (!tipoExameSelecionado || !tiposExames[tipoExameSelecionado]) {
                    return null;
                  }
                  
                  const campos = tiposExames[tipoExameSelecionado].campos;
                  const requerArquivo = tiposExames[tipoExameSelecionado].requerArquivo;
                  
                  return (
                    <div style={{ 
                      background: '#f9f9f9', 
                      padding: '15px', 
                      borderRadius: '8px',
                      marginBottom: '15px',
                      border: '1px dashed #d9d9d9'
                    }}>
                      <h4 style={{ color: '#1890ff', marginBottom: '12px' }}>
                        Campos específicos para {tipoExameSelecionado}
                      </h4>
                      
                      <Row gutter={16}>
                        {campos.map(campo => (
                          <Col span={8} key={campo}>
                            <Form.Item
                              label={campo}
                              name={`campo_${campo}`}
                              rules={[{ required: true, message: `Por favor, preencha ${campo}` }]}
                            >
                              <Input.TextArea
                                placeholder={`Valor para ${campo}`}
                                rows={1}
                                style={{ borderRadius: 6 }}
                              />
                            </Form.Item>
                          </Col>
                        ))}
                      </Row>
                      
                      {/* Upload de documentos */}
                      <Divider dashed style={{ margin: '10px 0 15px' }} />
                      
                      <Form.Item 
                        label={
                          <span>
                            Upload de Documentos
                            {requerArquivo && <span style={{color: 'red'}}> *</span>}
                          </span>
                        }
                        extra={requerArquivo ? "Este tipo de exame requer documentos anexos." : "Upload de documentos é opcional."}
                      >
                        <Upload
                          listType="picture"
                          fileList={arquivosExames[tipoExameSelecionado] || []}
                          onChange={(info) => handleFileUpload(info, tipoExameSelecionado)}
                          beforeUpload={() => false} // Impedir o upload automático
                        >
                          <Button icon={<UploadOutlined />} style={{ borderRadius: 6 }}>
                            Selecionar Arquivos
                          </Button>
                          <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                            Suporta PDFs, JPG, PNG (máx: 5 arquivos)
                          </span>
                        </Upload>
                      </Form.Item>
                      
                      <div style={{ textAlign: 'right', marginTop: '10px' }}>
                        <Button
                          type="primary"
                          onClick={() => {
                            // Coletar os campos necessários para este tipo de exame
                            const camposNecessarios = ['tipoExame'];
                            const tipoExameSel = formExames.getFieldValue('tipoExame');
                            
                            if (tipoExameSel && tiposExames[tipoExameSel]) {
                              tiposExames[tipoExameSel].campos.forEach(campo => {
                                camposNecessarios.push(`campo_${campo}`);
                              });
                            }
                            
                            // Validar apenas os campos necessários
                            formExames
                              .validateFields(camposNecessarios)
                              .then(() => {
                                adicionarResultadoExame();
                              })
                                .catch(err => {
                                  // Validation failed, handle error if needed
                                });
                          }}
                          style={{
                            background: '#1890ff',
                            borderColor: '#1890ff',
                            borderRadius: 6
                          }}
                        >
                          Adicionar Este Exame
                        </Button>
                      </div>
                    </div>
                  );
                }}
              </Form.Item>

              {/* Lista de Exames Adicionados */}
              <div style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                padding: 16,
                marginTop: 16
              }}>
                <h4 style={{ color: '#52c41a', marginBottom: 12, fontSize: 16 }}>
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  Exames Registrados ({Object.keys(resultadosExames).length}):
                </h4>
                {Object.keys(resultadosExames).length === 0 ? (
                  <p style={{ color: '#999', fontStyle: 'italic', margin: 0 }}>
                    Nenhum exame registrado ainda. Use o formulário acima para adicionar exames com seus resultados.
                  </p>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {Object.entries(resultadosExames).map(([tipoExame, resultado], idx) => (
                      <div key={idx} style={{
                        background: '#fff',
                        border: '1px solid #d9d9d9',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            color: '#1890ff', 
                            marginBottom: 10,
                            borderBottom: '1px solid #e8e8e8',
                            paddingBottom: 8,
                            fontSize: '16px'
                          }}>
                            {tipoExame}
                          </div>
                          
                          {resultado.valores ? (
                            <div>
                              {Object.entries(resultado.valores).map(([campo, valor], i) => (
                                <div key={i} style={{ 
                                  marginBottom: 6, 
                                  display: 'flex',
                                  fontSize: '14px'
                                }}>
                                  <div style={{ 
                                    fontWeight: 'bold', 
                                    marginRight: 8, 
                                    color: '#555',
                                    width: '150px' 
                                  }}>
                                    {campo}:
                                  </div>
                                  <div style={{ color: '#333' }}>
                                    {valor}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Mostrar arquivos anexados */}
                              {resultado.arquivos && resultado.arquivos.length > 0 && (
                                <div style={{ 
                                  marginTop: 12,
                                  borderTop: '1px dashed #e8e8e8',
                                  paddingTop: 8
                                }}>
                                  <div style={{ fontWeight: 'bold', color: '#555', marginBottom: 6 }}>
                                    Documentos Anexados:
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {resultado.arquivos.map((arquivo, i) => {
                                      // Determinar o ícone baseado na extensão do arquivo
                                      let icone = <FileTextOutlined />;
                                      if (arquivo.name) {
                                        const ext = arquivo.name.split('.').pop().toLowerCase();
                                        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                                          icone = <FileImageOutlined />;
                                        } else if (['pdf'].includes(ext)) {
                                          icone = <FilePdfOutlined />;
                                        }
                                      }
                                      
                                      return (
                                        <Tag key={i} color="blue" style={{ 
                                          padding: '4px 8px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px'
                                        }}>
                                          {icone}
                                          <span>{arquivo.name || `Arquivo ${i+1}`}</span>
                                        </Tag>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '14px', color: '#333' }}>
                              {resultado}
                            </div>
                          )}
                        </div>
                        <Button 
                          type="link" 
                          danger 
                          icon={<EditOutlined />}
                          onClick={() => {
                            const novosResultados = { ...resultadosExames };
                            delete novosResultados[tipoExame];
                            setResultadosExames(novosResultados);
                            
                            // Limpar também os arquivos associados
                            if (arquivosExames[tipoExame]) {
                              const novosArquivos = { ...arquivosExames };
                              delete novosArquivos[tipoExame];
                              setArquivosExames(novosArquivos);
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button
                  onClick={() => setIsExameModalVisible(false)}
                  style={{ borderRadius: 6 }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="primary"
                  onClick={() => {
                    if (Object.keys(resultadosExames).length === 0) {
                      message.error('Por favor, adicione pelo menos um resultado de exame.');
                      return;
                    }
                    handleFinishExames();
                  }}
                  icon={<CheckCircleOutlined />}
                  disabled={Object.keys(resultadosExames).length === 0}
                  style={{
                    background: Object.keys(resultadosExames).length === 0 ? '#d9d9d9' : '#52c41a',
                    borderColor: Object.keys(resultadosExames).length === 0 ? '#d9d9d9' : '#52c41a',
                    borderRadius: 6
                  }}
                >
                  Finalizar e Concluir Exames ({Object.keys(resultadosExames).length})
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default LaboratorioPaciente;
