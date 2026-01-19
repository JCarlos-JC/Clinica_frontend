import React, { useState, useContext } from 'react';
import { ClinicContext } from '../../context/ClinicContext';
import { Table, Button, Modal, Form, Input, message, Tabs, Card, Tag, Space, Row, Col, Select, Upload, Divider } from 'antd';
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

const LaboratorioPaciente = () => {  // Atualizar de triagens para exames pendentes
  // Função para normalizar exames (garantir que sejam sempre strings ou objetos processados)
  const normalizarExames = (exames) => {
    if (!exames) return [];
    
    if (!Array.isArray(exames)) {
      // Se for uma string simples
      if (typeof exames === 'string') return [exames];
      // Se for um objeto
      if (typeof exames === 'object' && exames !== null) {
        if (exames.nome) return [String(exames.nome)];
        return [JSON.stringify(exames)];
      }
      return [String(exames)];
    }
    
    // Se for array, garantir que cada item seja string
    return exames.map(exame => {
      if (typeof exame === 'string') return exame;
      if (typeof exame === 'object' && exame !== null) {
        if (exame.nome) return String(exame.nome);
        return JSON.stringify(exame);
      }
      return String(exame);
    });
  };

  const {
    pacientes,
    triagensRealizadas,
    setTriagensRealizadas,
    examesPendentes,
    setExamesPendentes,
    examesConcluidos,
    setExamesConcluidos,
    consultasPendentes,
    setConsultasPendentes,
    atualizarUtenteAutonomo
  } = useContext(ClinicContext);

  const [isExameModalVisible, setIsExameModalVisible] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [resultadosExames, setResultadosExames] = useState({});
  const [formExames] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [arquivosExames, setArquivosExames] = useState({});
  
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

  // Filtrar apenas pacientes com exames aprovados e pagos (liberados para laboratório)
  const pacientesExamesPendentes = (examesPendentes || []).filter(exame =>
    exame.status === 'pago_laboratorio'
  );
  const examesConcluidosLista = examesConcluidos || []; const realizarExames = (paciente) => {
    // Priorizar exames selecionados (que foram marcados como realizáveis)
    let examesParaRealizar;

    if (Array.isArray(paciente.examesSelecionados) && paciente.examesSelecionados.length > 0) {
      // Use os exames que foram selecionados como realizáveis
      examesParaRealizar = paciente.examesSelecionados;
    } else if (Array.isArray(paciente.examesSolicitados)) {
      // Fallback para casos onde ainda não passaram pela seleção
      examesParaRealizar = paciente.examesSolicitados;
    } else if (paciente.examesSolicitados) {
      examesParaRealizar = [paciente.examesSolicitados];
    } else {
      examesParaRealizar = [];
    }
    
    const pacienteNormalizado = {
      ...paciente,
      examesSolicitados: normalizarExames(examesParaRealizar), // Usar apenas os exames selecionados
      examesOriginais: normalizarExames(paciente.examesSolicitados), // Manter referência aos originais
      examesSelecionados: normalizarExames(paciente.examesSelecionados || examesParaRealizar)
    };

    setPacienteSelecionado(pacienteNormalizado);
    setResultadosExames({});
    formExames.resetFields();
    setIsExameModalVisible(true);
  };
  const handleFinishExames = () => {
    if (Object.keys(resultadosExames).length === 0) {
      message.error('Por favor, adicione pelo menos um resultado de exame.');
      return;
    }

    // Determinar o ID do paciente para uso na criação do exame concluído
    let pacienteId = pacienteSelecionado.pacienteId || pacienteSelecionado.id;
    
    // CORREÇÃO: Log para diagnóstico de ID antes de completar o exame

    const exameCompletado = {
      ...pacienteSelecionado,
      resultadosExames: { ...resultadosExames },
      dataExames: new Date().toLocaleString(),
      dataAtualizacao: new Date().toLocaleString(),
      status: 'exames_concluidos',
      tipoTriagem: 'exames', // Garantir que o exame é reconhecido como um exame
      retornoConsulta: pacienteSelecionado.tipoUtente !== 'autonomo', // Apenas pacientes regulares retornam ao consultório
      // Manter tanto os exames selecionados quanto os originais para referência
      // Garantir que todos os campos de exames sejam strings e não objetos
      examesSelecionados: normalizarExames(pacienteSelecionado.examesSelecionados) || [],
      examesOriginais: normalizarExames(pacienteSelecionado.examesOriginais || pacienteSelecionado.examesSolicitados) || [],
      examesSolicitados: normalizarExames(pacienteSelecionado.examesSelecionados || pacienteSelecionado.examesSolicitados) || [],
      examesNaoRealizaveis: pacienteSelecionado.examesNaoRealizaveis || [],
      // IMPORTANTE: Garantir que o NID seja preservado para identificação consistente
      nid: pacienteSelecionado.nid,
      id: pacienteSelecionado.id || Date.now(), // Manter ID original ou criar novo
      solicitadoPor: pacienteSelecionado.solicitadoPor ||
        (pacienteSelecionado.tipoUtente === 'autonomo' ? 'Utente Autônomo' : 'Triagem')
    };

    // Adicionar o exame concluído à lista
    setExamesConcluidos([...examesConcluidos, exameCompletado]);

    // Se o exame veio de uma triagem, atualizar também a lista de triagens
    if (pacienteSelecionado.tipoTriagem && pacienteSelecionado.tipoUtente !== 'autonomo') {
      const novaListaTriagens = triagensRealizadas.map(t =>
        t.id === pacienteSelecionado.id ? exameCompletado : t
      );
      setTriagensRealizadas(novaListaTriagens);
    }
    // Se não veio de uma triagem e não é autônomo, adicionar às triagens realizadas
    else if (pacienteSelecionado.tipoUtente !== 'autonomo') {
      setTriagensRealizadas([...triagensRealizadas, exameCompletado]);
    }

    // CORREÇÃO: Para pacientes não autônomos, atualizar também a lista de pacientes 
    // e a lista de consultas pendentes para garantir que sejam detectados como em consulta
    if (pacienteSelecionado.tipoUtente !== 'autonomo') {
      // Atualizar o status do paciente para exames concluídos
      const pacienteId = pacienteSelecionado.pacienteId || pacienteSelecionado.id;
      
      // Verificar se o paciente está na lista de consultas pendentes
      const pacienteEmConsultasPendentes = pacienteSelecionado.emConsultasPendentes || 
        consultasPendentes.some(c => c.id === pacienteId || c.pacienteId === pacienteId);

      // Se não estiver nas consultas pendentes, adicionar para garantir que apareça como "em consulta"
      if (!pacienteEmConsultasPendentes) {
        
        // Criar consulta pendente com os dados do exame concluído
        const novaPendencia = {
          ...exameCompletado,
          statusExames: 'concluido',
          examesEmAndamento: false,
          aguardandoExames: false,
          retornoComExames: true
        };
        
        setConsultasPendentes(prev => [...prev, novaPendencia]);
      } else {
        // Atualizar a consulta pendente existente
        const novasConsultasPendentes = consultasPendentes.map(c => {
          if (c.id === pacienteId || c.pacienteId === pacienteId) {
            return {
              ...c,
              statusExames: 'concluido',
              examesEmAndamento: false,
              aguardandoExames: false,
              retornoComExames: true,
              resultadosExames: exameCompletado.resultadosExames,
              dataExames: exameCompletado.dataExames
            };
          }
          return c;
        });
        
        setConsultasPendentes(novasConsultasPendentes);
      }
    }

    // Remover dos pendentes
    setExamesPendentes(examesPendentes.filter(p => p.id !== pacienteSelecionado.id));

    // Se for um utente autônomo, atualizar o status na lista de utentes autônomos
    if (pacienteSelecionado.tipoUtente === 'autonomo') {
      // Salvar histórico antes de resetar
      const novoHistorico = {
        dataExames: new Date().toLocaleString(),
        resultadosExames: { ...resultadosExames },
        examesRealizados: pacienteSelecionado.examesSelecionados || pacienteSelecionado.examesSolicitados || [],
        observacoes: pacienteSelecionado.observacoes || ''
      };

      // Manter histórico anterior e adicionar novo
      const historicoAnterior = pacienteSelecionado.historicoExames || [];
      const novoHistoricoCompleto = [...historicoAnterior, novoHistorico];

      const utenteResetado = {
        // USAR O ID ORIGINAL DO UTENTE AUTÔNOMO, NÃO O ID DO LABORATÓRIO
        id: pacienteSelecionado.pacienteId || pacienteSelecionado.id,
        // Preservar dados do utente
        nome: pacienteSelecionado.nome,
        apelido: pacienteSelecionado.apelido,
        nid: pacienteSelecionado.nid, // PRESERVAR NID GERADO
        hospitalProveniencia: pacienteSelecionado.hospitalProveniencia,
        dataNascimento: pacienteSelecionado.dataNascimento,
        genero: pacienteSelecionado.genero,
        tipoDocumento: pacienteSelecionado.tipoDocumento,
        bilheteIdentidade: pacienteSelecionado.bilheteIdentidade,
        celular: pacienteSelecionado.celular,
        celularalternativo: pacienteSelecionado.celularalternativo,
        dataCadastro: pacienteSelecionado.dataCadastro,
        
        // Atualizar dados do último exame e limpar exames ativos
        ultimoExame: novoHistorico,
        historicoExames: novoHistoricoCompleto,
        dataExames: new Date().toLocaleString(),
        resultadosExames: { ...resultadosExames },
        
        // CRÍTICO: Resetar TODOS os campos de exames ativos para null
        examesSolicitados: null,
        examesSelecionados: null,
        examesNaoRealizaveis: null,
        status: null,
        statusPagamento: null,
        valorExames: null,
        dataSolicitacao: null,
        dataPagamento: null,
        metodoPagamento: null,
        observacoes: null
      };

      // Forçar atualização com callback
      const resultado = atualizarUtenteAutonomo(utenteResetado);
      
      // Adicionar pequeno delay para garantir que a atualização seja processada
      setTimeout(() => {
        message.success({
          content: `Exames concluídos para ${pacienteSelecionado.nome}! Utente resetado para novo ciclo.`,
          duration: 3
        });
      }, 100);
    }

    // Mostrar mensagem de sucesso personalizada
    const examesTotais = (pacienteSelecionado.examesSelecionados || []).length;
    const examesNaoRealizaveis = (pacienteSelecionado.examesNaoRealizaveis || []).length;

    let mensagemSucesso = `Exames concluídos para ${pacienteSelecionado.nome}!`;
    if (examesTotais > 0 && examesNaoRealizaveis > 0) {
      mensagemSucesso += `\n${examesTotais} exame(s) realizados, ${examesNaoRealizaveis} não realizáveis.`;
    }

    message.success({
      content: mensagemSucesso,
      duration: 4
    });

    setIsExameModalVisible(false);
    setPacienteSelecionado(null);
    setResultadosExames({});
    formExames.resetFields();
  };

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

  // Colunas para cada tipo de tabela  
  const columnsExamesPendentes = [
    {
      title: 'NID/Documento',
      key: 'documento',
      render: (_, record) => {
        if (record.tipoUtente === 'autonomo') {
          // Para utentes autônomos, mostrar NID gerado ou BI como fallback
          const identificador = record.nid || record.bilheteIdentidade || 'N/A';
          return (
            <span style={{ 
              fontWeight: record.nid ? 'bold' : 'normal',
              color: record.nid ? '#1890ff' : '#666',
              backgroundColor: record.nid ? '#f0f9ff' : 'transparent',
              padding: record.nid ? '2px 4px' : '0',
              borderRadius: record.nid ? '3px' : '0',
              fontSize: '12px'
            }}>
              {identificador}
            </span>
          );
        } else {
          return record.nid || 'N/A';
        }
      }
    },
    { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    {
      title: 'Idade',
      dataIndex: 'dataNascimento',
      key: 'idade',
      render: (text) => {
        if (!text) return 'N/A';
        let birthDate;
        if (text && typeof text === 'object' && typeof text.getFullYear === 'function') {
          birthDate = text;
        } else if (typeof text === 'string' && !isNaN(Date.parse(text))) {
          birthDate = new Date(text);
        } else if (dayjs.isDayjs && dayjs.isDayjs(text)) {
          birthDate = text.toDate();
        } else {
          return 'N/A';
        }
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        return (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) ? age - 1 : age;
      }
    },
    {
      title: 'Exames Solicitados',
      key: 'examesSelecionados',
      render: (_, record) => (
        <div>
          {/* Mostrar apenas os exames selecionados (realizáveis) */}
          {record.examesSelecionados && Array.isArray(record.examesSelecionados) && record.examesSelecionados.length > 0 ? (
            <div>
              {record.examesSelecionados.map((exame, idx) => (
                <div key={idx} style={{
                  color: '#52c41a',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  ✓ {typeof exame === 'object' ? exame.nome || 'Exame sem nome' : exame}
                </div>
              ))}
            </div>
          ) : record.examesSolicitados && Array.isArray(record.examesSolicitados) && record.examesSolicitados.length > 0 ? (
            /* Fallback para exames que ainda não passaram pela seleção */
            <div>
              {record.examesSolicitados.map((exame, idx) => (
                <div key={idx} style={{
                  marginBottom: '4px'
                }}>
                  {typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}
                </div>
              ))}
            </div>
          ) : record.examesSolicitados ? (
            <div>
              {Array.isArray(record.examesSolicitados) 
                ? record.examesSolicitados.map((exame, idx) => (
                    <div key={idx}>{typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}</div>
                  ))
                : typeof record.examesSolicitados === 'object'
                  ? (record.examesSolicitados.nome || JSON.stringify(record.examesSolicitados))
                  : String(record.examesSolicitados)
              }
            </div>
          ) : (
            'Nenhum exame especificado'
          )}
        </div>
      )
    },
    {
      title: 'Prioridade',
      dataIndex: 'prioridade',
      key: 'prioridade',
      render: (prioridade) => {
        let color = 'blue';
        if (prioridade === 'Urgente') {
          color = 'red';
        } else if (prioridade === 'Baixa') {
          color = 'green';
        }
        return (
          <Tag color={color}>{prioridade || 'Normal'}</Tag>
        );
      }
    },
    {
      title: 'Origem',
      dataIndex: 'solicitadoPor',
      key: 'solicitadoPor',
      render: (origem, record) => (
        <Tag color={record.tipoUtente === 'autonomo' ? 'green' : 'purple'}>
          {origem || (record.tipoUtente === 'autonomo' ? 'Utente Autônomo' : 'Triagem')}
        </Tag>
      )
    },
    {
      title: 'Data da Solicitação',
      dataIndex: 'dataSolicitacao',
      key: 'dataSolicitacao',
      sorter: (a, b) => new Date(a.dataSolicitacao) - new Date(b.dataSolicitacao)
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<ExperimentOutlined />}
          onClick={() => realizarExames(record)}
        >
          Realizar Exames
        </Button>
      )
    }
  ];

  const columnsExamesConcluidos = [
    { title: 'NID', dataIndex: 'nid', key: 'nid' },
    { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },
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
          title="Laboratório - Exames Aprovados e Liberados"
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
                  Exames Liberados
                  {pacientesExamesPendentes?.length > 0 &&
                    <span style={{
                      backgroundColor: '#1890ff',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 8px',
                      fontSize: '12px',
                      marginLeft: '8px'
                    }}>
                      {pacientesExamesPendentes.length}
                    </span>
                  }
                </span>
              }
              key="1"
            >
              <h3>Pacientes com Exames Liberados para Laboratório</h3>
              <Table
                columns={columnsExamesPendentes}
                dataSource={pacientesExamesPendentes}
                rowKey="id"
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há exames liberados para o laboratório. Os exames devem ser aprovados e pagos na aba "Solicitações de Exames" primeiro.' }}
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
              <h3>Histórico de Exames</h3>
              <Table
                columns={columnsExamesConcluidos}
                dataSource={examesConcluidosLista}
                rowKey="id"
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há exames realizados' }}
              />
            </TabPane>
          </Tabs>
        </Card>        {/* Modal de Exames */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ExperimentOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
              <span style={{ color: '#2d3a4a', fontWeight: 'bold', fontSize: '18px' }}>
                Realizar Exames - {pacienteSelecionado?.nome} {pacienteSelecionado?.apelido}
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
            background: pacienteSelecionado?.tipoUtente === 'autonomo' ? '#e6f7ff' : '#fff3cd',
            border: pacienteSelecionado?.tipoUtente === 'autonomo' ? '1px solid #91d5ff' : '1px solid #ffeaa7',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <UserOutlined style={{ 
                    color: pacienteSelecionado?.tipoUtente === 'autonomo' ? '#1890ff' : '#d4621b', 
                    marginRight: 8, fontSize: 16 
                  }} />
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: pacienteSelecionado?.tipoUtente === 'autonomo' ? '#1890ff' : '#d4621b',
                    fontSize: 16
                  }}>
                    {pacienteSelecionado?.nome} {pacienteSelecionado?.apelido}
                  </span>
                </div>
                <div style={{ marginLeft: 24, color: '#555' }}>
                  <div><strong>Tipo:</strong> {pacienteSelecionado?.tipoUtente === 'autonomo' ? 'Utente Autônomo' : 'Utente Regular'}</div>
                  <div><strong>Documento:</strong> {
                    pacienteSelecionado?.tipoUtente === 'autonomo' 
                      ? `${pacienteSelecionado?.tipoDocumento?.toUpperCase()}: ${pacienteSelecionado?.bilheteIdentidade}`
                      : `NID: ${pacienteSelecionado?.nid}`
                  }</div>
                  {pacienteSelecionado?.celular && (
                    <div><strong>Celular:</strong> {pacienteSelecionado.celular}</div>
                  )}
                  {pacienteSelecionado?.hospitalProveniencia && (
                    <div><strong>Hospital de Proveniência:</strong> {pacienteSelecionado.hospitalProveniencia}</div>
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
            {pacienteSelecionado?.examesSelecionados && Array.isArray(pacienteSelecionado.examesSelecionados) && pacienteSelecionado.examesSelecionados.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {pacienteSelecionado.examesSelecionados.map((exame, index) => (
                  <Tag key={index} color="blue" style={{ fontSize: '13px', padding: '4px 8px' }}>
                    {typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}
                  </Tag>
                ))}
              </div>
            ) : pacienteSelecionado?.examesSolicitados && Array.isArray(pacienteSelecionado.examesSolicitados) && pacienteSelecionado.examesSolicitados.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {pacienteSelecionado.examesSolicitados.map((exame, index) => (
                  <Tag key={index} color="blue" style={{ fontSize: '13px', padding: '4px 8px' }}>
                    {typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}
                  </Tag>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', fontStyle: 'italic' }}>Nenhum exame específico solicitado</p>
            )}
            
            {pacienteSelecionado?.examesNaoRealizaveis && pacienteSelecionado.examesNaoRealizaveis.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #d1d5db' }}>
                <div style={{ fontSize: '14px', color: '#dc2626', marginBottom: 8 }}>
                  <strong>Exames não realizáveis nesta clínica:</strong>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {pacienteSelecionado.examesNaoRealizaveis.map((exame, index) => (
                    <Tag key={index} color="red" style={{ fontSize: '12px', padding: '2px 6px' }}>
                      {typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}
                    </Tag>
                  ))}
                </div>
              </div>
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
                                console.log('Validation Failed:', err);
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
