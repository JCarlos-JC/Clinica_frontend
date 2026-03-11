import React, { useEffect, useState, useContext } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Badge, 
  Timeline,
  Tabs,
  Descriptions,
  Tag,
  Divider,
  message,
  Table,
  Select,
  InputNumber,
  TimePicker,
  DatePicker,
  Checkbox
} from 'antd';
import { 
  MedicineBoxOutlined, 
  CheckCircleOutlined, 
  StopOutlined, 
  HistoryOutlined,
  UserOutlined,
  FileTextOutlined,
  MedicineBoxTwoTone,
  HeartOutlined,
  ExperimentOutlined,
  PrinterOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import AltaModal from './AltaModal';
import ObitoModal from './ObitoModal';
import TransferenciaModal from './TransferenciaModal';
import { ClinicContext } from '../../context/ClinicContext';
import consultaService from '../../services/consultaService';
import patientService from '../../services/patientService';

const { Option } = Select;

const ConsultaDetalhadaModal = ({ 
  open, 
  onCancel, 
  onAlta, 
  onObito, 
  onTransferir,
  agendamento, 
  onFinish, 
  loading, 
  onVerHistorico 
}) => {  
  // Função para formatar resultado de exame (similar ao ConsultaPaciente.jsx)
  const formatarResultadoExame = (valor) => {
    if (!valor) return '';
    
    if (typeof valor === 'string') {
      return valor;
    }
    
    if (typeof valor === 'object') {
      // Se tem a propriedade 'nome', usar ela
      if (valor.nome) {
        return valor.nome;
      }
      
      // Se tem 'valores', formatar os valores
      if (valor.valores && typeof valor.valores === 'object') {
        const valoresFormatados = Object.entries(valor.valores)
          .map(([nome, val]) => `${nome}: ${val}`)
          .join(' | ');
        
        // Se também tem arquivos, adicionar informação
        const arquivosInfo = valor.arquivos && Array.isArray(valor.arquivos) && valor.arquivos.length > 0 
          ? ` (${valor.arquivos.length} arquivo(s) anexo(s))`
          : '';
        
        return valoresFormatados + arquivosInfo;
      }
      
      // Se tem 'arquivos', mencionar os arquivos
      if (valor.arquivos && Array.isArray(valor.arquivos)) {
        const arquivosInfo = valor.arquivos.length > 0 
          ? ` (${valor.arquivos.length} arquivo(s) anexo(s))`
          : '';
        
        return `Resultados disponíveis${arquivosInfo}`;
      }
      
      // Para objetos complexos como {"Hemograma Completo":{"valores":{"Hemácias":"4",...}}}
      // Detectar se é um exame com estrutura aninhada
      const entries = Object.entries(valor);
      if (entries.length > 0) {
        return entries
          .filter(([key, val]) => val !== null && val !== undefined)
          .map(([nomeExame, dadosExame]) => {
            if (typeof dadosExame === 'object' && dadosExame !== null) {
              // Se tem a estrutura {valores: {...}, arquivos: [...]}
              if (dadosExame.valores && typeof dadosExame.valores === 'object') {
                const valoresFormatados = Object.entries(dadosExame.valores)
                  .map(([param, val]) => `${param}: ${val}`)
                  .join(', ');
                
                const arquivosInfo = dadosExame.arquivos && Array.isArray(dadosExame.arquivos) && dadosExame.arquivos.length > 0 
                  ? ` (${dadosExame.arquivos.length} arquivo(s))`
                  : '';
                
                return `${nomeExame}: ${valoresFormatados}${arquivosInfo}`;
              }
              
              // Se for um objeto simples, tentar extrair informações
              if (Object.keys(dadosExame).length <= 5) {
                const subValores = Object.entries(dadosExame)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ');
                return `${nomeExame}: ${subValores}`;
              }
              
              // Para objetos muito complexos
              return `${nomeExame}: [Dados detalhados disponíveis]`;
            }
            
            // Se não for objeto, usar valor direto
            return `${nomeExame}: ${dadosExame}`;
          })
          .join(' | ');
      }
    }
    
    return String(valor);
  };

  const [form] = Form.useForm();
  const [altaModalVisible, setAltaModalVisible] = useState(false);
  const [obitoModalVisible, setObitoModalVisible] = useState(false);
  const [transferenciaModalVisible, setTransferenciaModalVisible] = useState(false);
  const [historicoVisivel, setHistoricoVisivel] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  // Novos estados para os modais de Exames e Prescrições
  const [exameModalVisible, setExameModalVisible] = useState(false);
  const [prescricaoModalVisible, setPrescricaoModalVisible] = useState(false);
  const [exames, setExames] = useState([]);
  const [prescricoes, setPrescricoes] = useState([]);

  // Forms para os novos modais
  const [exameForm] = Form.useForm();
  const [prescricaoForm] = Form.useForm();

  const { TabPane } = Tabs;
  const {
    triagensRealizadas,
    consultasRealizadas,
    examesPendentes,
    setExamesPendentes,
    // Adicionar consultasPendentes e setConsultasPendentes para uso nas funções internas
    consultasPendentes,
    setConsultasPendentes
  } = useContext(ClinicContext);
    // Debug log for context data
  useEffect(() => {

  }, [triagensRealizadas, consultasRealizadas]);

  // Debug log for agendamento data
  useEffect(() => {
  }, [agendamento]);

  // Reset form when modal is closed or agendamento changes
  useEffect(() => {
    if (open && agendamento) {
      // Pre-fill form with existing data if available
      form.setFieldsValue({
        historico: agendamento.historico || '',
        sintomas: agendamento.sintomas || '',
        diagnostico: agendamento.diagnostico || '',
        recomendacoes: agendamento.recomendacoes || ''
      });
    }
  }, [open, agendamento, form]);  // Event handlers
  const handleFinish = (values) => {
    // Determine consultation status based on what was added
    const temPrescricoes = (prescricoes.length > 0) || (agendamento?.prescricoes?.length > 0);
    const temExames = (exames.length > 0) || (agendamento?.exames?.length > 0);
    
    // Nova lógica de finalização:
    // - CONSULTA pode ser finalizada com exames ou prescrições
    // - CICLO DO PACIENTE só termina com prescrições, óbito ou transferência
    let consultaStatus = 'em_andamento'; // Status padrão
    let deveFinalizarConsulta = false; // Salvar a consulta
    let deveTerminarCiclo = false; // Remover paciente da lista de pendentes
    
    if (temPrescricoes) {
      // Se tem prescrições, finaliza consulta E termina ciclo
      consultaStatus = 'finalizada';
      deveFinalizarConsulta = true;
      deveTerminarCiclo = true;
    } else if (temExames && !temPrescricoes) {
      // Se só tem exames, finaliza consulta MAS NÃO termina ciclo
      consultaStatus = 'finalizada_com_exames'; // Status específico
      deveFinalizarConsulta = true;
      deveTerminarCiclo = false; // Paciente permanece na lista para prescrições futuras
    } else if (!temExames && !temPrescricoes) {
      // Se não tem nem exames nem prescrições, consulta básica finalizada e termina ciclo
      consultaStatus = 'finalizada';
      deveFinalizarConsulta = true;
      deveTerminarCiclo = true;
    }

    // Se há exames solicitados que foram enviados para o laboratório,
    // adicionar aos exames concluídos do contexto quando finalizados
    if (temExames && deveFinalizarConsulta) {
      // Exames are already handled by context updates
    }

    // CORREÇÃO: Verificar se esta é uma consulta de retorno com exames
    const isRetornoComExames = agendamento && 
      (agendamento.retornoComExames === true || 
       agendamento.resultadosExames || 
       (typeof agendamento.exameId === 'number' || typeof agendamento.exameId === 'string'));
    
    // Include any existing prescription or exam data from the agendamento and from the modals
    const completeData = {
      ...values,
      agendamentoId: agendamento?.id,
      // Include exams and prescriptions from both agendamento and local state
      exames: [...(agendamento?.exames || []), ...exames],
      prescricoes: [...(agendamento?.prescricoes || []), ...prescricoes],
      dataAlta: agendamento?.dataAlta,
      // Add flags to indicate consultation completion criteria
      temPrescricao: temPrescricoes,
      temExames: temExames,
      // CORREÇÃO: Se tem exames e não tem prescrições, marcar explicitamente como aguardando exames
      aguardandoExames: temExames && !temPrescricoes,
      status: consultaStatus,
      deveFinalizarConsulta: deveFinalizarConsulta, // Sempre true se chegou até aqui
      deveTerminarCiclo: deveTerminarCiclo, // Só true se tem prescrições/óbito/transferência
      // Manter informações relacionadas a exames para rastreamento
      retornoComExames: isRetornoComExames,
      resultadosExames: agendamento?.resultadosExames || null,
      exameId: agendamento?.exameId || null,
      // Add consultation finish type for debugging
      tipoFinalizacao: temPrescricoes 
        ? 'com_prescricao' 
        : (temExames 
           ? 'so_exames' 
           : (isRetornoComExames ? 'retorno_exames' : 'basica'))
    };
    
    if (isRetornoComExames) {
    }
    
    onFinish(completeData);
  };

  const handleExames = () => {
    form.validateFields().then(values => {
      // Then open the Exame Modal
      setExameModalVisible(true);
    }).catch(error => {
      console.error("Form validation failed:", error);
    });
  };

  const handlePrescricoes = () => {
    form.validateFields().then(values => {
      // Then open the Prescricao Modal
      setPrescricaoModalVisible(true);
    }).catch(error => {
      console.error("Form validation failed:", error);
    });
  };

  const handleAltaModalCancel = (altaCompleted = false, altaData = null) => {
    setAltaModalVisible(false);
    
    // If alta was completed and altaData was provided, store the data in the state
    if (altaCompleted && altaData) {
      // Update the agendamento with the exames and prescricoes data
      // This will allow us to include this data when the user finalizes the consultation
      agendamento.exames = altaData.exames || [];
      agendamento.prescricoes = altaData.prescricoes || [];
      
      message.success({
        content: 'Dados de alta salvos. Agora você pode finalizar a consulta.',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
    }
  };  const handleObito = () => {
    form.validateFields().then(values => {
      // Save the form data first
      setObitoModalVisible(true);
    }).catch(error => {
      console.error("Form validation failed:", error);
    });
  };
  const handleObitoModalCancel = (obitoCompleted = false, obitoData = null) => {
    setObitoModalVisible(false);
    
    // If óbito was completed and obitoData was provided, call onObito
    if (obitoCompleted && obitoData) {
      const formValues = form.getFieldsValue();
      const obitoCompleteData = { 
        ...formValues, 
        ...obitoData,
        agendamentoId: agendamento?.id,
        // Óbito sempre termina o ciclo
        deveFinalizarConsulta: true,
        deveTerminarCiclo: true,
        tipoFinalizacao: 'obito',
        status: 'obito'
      };
      onObito(obitoCompleteData);
    }
  };
  
  const handleTransferir = () => {
    form.validateFields().then(values => {
      // Save the form data first
      setTransferenciaModalVisible(true);
    }).catch(error => {
      console.error("Form validation failed:", error);
    });
  };
  
  const handleTransferenciaModalCancel = (transferenciaCompleted = false, transferenciaData = null) => {
    setTransferenciaModalVisible(false);
    
    // If transferência was completed and transferenciaData was provided, call onTransferir
    if (transferenciaCompleted && transferenciaData) {
      const formValues = form.getFieldsValue();
      const transferenciaCompleteData = { 
        ...formValues, 
        ...transferenciaData,
        agendamentoId: agendamento?.id,
        // Transferência sempre termina o ciclo
        deveFinalizarConsulta: true,
        deveTerminarCiclo: true,
        tipoFinalizacao: 'transferencia',
        status: 'transferido'
      };
      onTransferir(transferenciaCompleteData);
    }
  };

  // Componentes dos Modais de Exames e Prescrições
  const ExameModal = () => {
    const [examOptions, setExamOptions] = useState([
      { value: 'Hemograma', label: 'Hemograma' },
      { value: 'Glicemia', label: 'Glicemia' },
      { value: 'Colesterol', label: 'Colesterol' },
      { value: 'Triglicerídeos', label: 'Triglicerídeos' },
      { value: 'Creatinina', label: 'Creatinina' },
      { value: 'Ureia', label: 'Ureia' },
      { value: 'TGO/AST', label: 'TGO/AST' },
      { value: 'TGP/ALT', label: 'TGP/ALT' },
      { value: 'Raio-X Tórax', label: 'Raio-X Tórax' },
      { value: 'Raio-X Coluna', label: 'Raio-X Coluna' },
      { value: 'Ultrassonografia Abdominal', label: 'Ultrassonografia Abdominal' },
      { value: 'Ultrassonografia Pélvica', label: 'Ultrassonografia Pélvica' },
      { value: 'Eletrocardiograma', label: 'Eletrocardiograma' },
      { value: 'Urina Tipo I', label: 'Urina Tipo I' },
      { value: 'Parasitológico de Fezes', label: 'Parasitológico de Fezes' },
    ]);
    const [customExameName, setCustomExameName] = useState('');
    const [enviarParaLaboratorio, setEnviarParaLaboratorio] = useState(true);
    const [loadingExamesAPI, setLoadingExamesAPI] = useState(false);

    const addCustomExame = () => {
      if (customExameName.trim() !== '') {
        const newOption = { value: customExameName, label: customExameName };
        setExamOptions([...examOptions, newOption]);
        setCustomExameName('');
      }
    };

    const adicionarExame = (values) => {
      if (!values.exames || values.exames.length === 0) {
        message.error('Por favor, selecione pelo menos um exame.');
        return;
      }

      const timestamp = Date.now();
      // Ensure values.exames is an array before mapping
      const examesArray = Array.isArray(values.exames) ? values.exames : [];
      
      const novosExames = examesArray.map((exame, index) => {
        // If exame is already an object, preserve its structure but ensure required fields
        if (exame && typeof exame === 'object') {
          return {
            id: exame.id || timestamp + index,
            nome: exame.nome || 'Exame sem nome',
            dataColeta: exame.dataColeta || (values.dataColeta ? values.dataColeta.format('DD/MM/YYYY') : new Date().toLocaleDateString()),
            observacoes: exame.observacoes || values.observacoes || '',
            prioridade: exame.prioridade || values.prioridade || 'Normal',
            estado: exame.estado || (values.enviarParaLaboratorio ? 'Enviado para Laboratório' : 'Solicitado')
          };
        }
        
        // If exame is a string or other primitive, create a standard object
        return {
          id: timestamp + index,
          nome: String(exame || 'Exame sem nome'),
          dataColeta: values.dataColeta ? values.dataColeta.format('DD/MM/YYYY') : new Date().toLocaleDateString(),
          observacoes: values.observacoes || '',
          prioridade: values.prioridade || 'Normal',
          estado: values.enviarParaLaboratorio ? 'Enviado para Laboratório' : 'Solicitado'
        };
      });

      setExames([...exames, ...novosExames]);
      
      // Se marcado para enviar ao laboratório, adicionar aos exames pendentes do contexto
      if (values.enviarParaLaboratorio) {
        const exameParaAprovacao = {
          id: timestamp,
          pacienteId: agendamento?.id,
          nid: agendamento?.nid,
          nome: agendamento?.nome,
          apelido: agendamento?.apelido,
          dataNascimento: agendamento?.dataNascimento,
          examesSolicitados: Array.isArray(values.exames) 
            ? values.exames.map(exame => typeof exame === 'object' ? exame.nome : exame).join(', ')
            : '', // String com todos os exames selecionados
          observacoes: values.observacoes,
          dataSolicitacao: new Date().toLocaleString(),
          status: 'pendente', // Status para aprovação na aba "Solicitações de Exames"
          statusPagamento: 'pendente',
          solicitadoPor: 'Consultório',
          prioridade: values.prioridade || 'Normal',
          dataColeta: values.dataColeta ? values.dataColeta.format('DD/MM/YYYY') : new Date().toLocaleDateString()
        };
        
        // Adicionar ao contexto global
        setExamesPendentes([...examesPendentes, exameParaAprovacao]);
        
        // CORREÇÃO: Marcar o paciente como "aguardando exames" nos consultasPendentes do ClinicContext
        // Isso garante que CadastroPaciente.jsx detecte corretamente o status
        if (agendamento && agendamento.id) {
          // Usar as referências existentes do contexto que já foram obtidas no componente principal
          if (consultasPendentes && setConsultasPendentes) {
            setConsultasPendentes(prev =>
              prev.map(p => {
                if (p.id === agendamento.id || p.pacienteId === agendamento.id) {
                  return {
                    ...p,
                    aguardandoExames: true,
                    examesEmAndamento: true
                  };
                }
                return p;
              })
            );
          }
        }
        
        message.success(`${Array.isArray(values.exames) ? values.exames.length : 0} exame(s) enviado(s) para aprovação na aba "Solicitações de Exames"!`);
      }

      exameForm.resetFields();
      message.success(`${novosExames.length} exame(s) adicionado(s) com sucesso`);
    };

    const handleExameModalFinish = async () => {
      if (exames.length === 0) {
        message.warning('Adicione pelo menos um exame antes de salvar.');
        return;
      }

      setLoadingExamesAPI(true);
      // Passo 1: Solicitar exames via Consultation-Service
      // POST http://127.0.0.1:8007/api/consultas/{id}/exames
      const consultaId = agendamento?.consulta_id || agendamento?.agendamento_id || agendamento?.id;

      try {
        const payload = {
          exames: exames.map(exame => ({
            tipo_exame: exame.nome,
            prioridade: (exame.prioridade || 'Normal').toLowerCase(),
            status: 'solicitado',
            data_coleta: exame.dataColeta || null,
            observacoes: exame.observacoes || ''
          })),
          observacoes: exames.map(e => e.observacoes).filter(Boolean).join('; ') || '',
          paciente_id: agendamento?.pacienteId || agendamento?.paciente_id || agendamento?.id,
        };

        console.log('📋 [ExameModal] Passo 1 - Solicitando exames no Consultation-Service:', {
          url: `POST /api/consultas/${consultaId}/exames`,
          payload
        });

        const resConsulta = await consultaService.solicitarExames(consultaId, payload);
        console.log('✅ [ExameModal] Passo 1 concluído:', resConsulta);

        // Passo 2: Confirmar no Patient-Service
        // PUT http://127.0.0.1:8002/api/solicitacoes-exames/{id}/confirmar
        const solicitacaoId =
          resConsulta?.data?.solicitacao_id ||
          resConsulta?.solicitacao_id ||
          resConsulta?.data?.id ||
          resConsulta?.id;

        if (solicitacaoId) {
          console.log('📋 [ExameModal] Passo 2 - Confirmando no Patient-Service:', {
            url: `PUT /api/solicitacoes-exames/${solicitacaoId}/confirmar`,
            solicitacaoId
          });
          const resPatient = await patientService.confirmarSolicitacaoExame(solicitacaoId);
          if (resPatient.success) {
            console.log('✅ [ExameModal] Passo 2 concluído:', resPatient.data);
          } else {
            console.warn('⚠️ [ExameModal] Passo 2 - Falha na confirmação Patient-Service:', resPatient.message);
          }
        } else {
          console.warn('⚠️ [ExameModal] Passo 2 - ID da solicitação não encontrado na resposta do Consultation-Service');
        }

        // Atualizar o contexto local
        if (consultasPendentes && setConsultasPendentes && agendamento?.id) {
          setConsultasPendentes(prev =>
            prev.map(p => {
              if (p.id === agendamento.id || p.pacienteId === agendamento.id) {
                return { ...p, aguardandoExames: true, statusExames: 'pendente' };
              }
              return p;
            })
          );
        }

        setExameModalVisible(false);
        message.success(`${exames.length} exame(s) solicitado(s) com sucesso e enviado(s) para o laboratório!`);

      } catch (error) {
        console.error('❌ [ExameModal] Erro no fluxo de solicitação de exames:', error);
        message.error(
          error.response?.data?.message ||
          'Erro ao solicitar exames. Verifique a conexão com o servidor.'
        );
      } finally {
        setLoadingExamesAPI(false);
      }
    };

    const exameColumns = [
      {
        title: 'Exame',
        dataIndex: 'nome',
        key: 'nome',
      },
      {
        title: 'Data Coleta',
        dataIndex: 'dataColeta',
        key: 'dataColeta',
      },
      {
        title: 'Prioridade',
        dataIndex: 'prioridade',
        key: 'prioridade',
        render: (prioridade) => (
          <Tag color={prioridade === 'Urgente' ? 'red' : prioridade === 'Alto' ? 'orange' : 'green'}>
            {prioridade}
          </Tag>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        key: 'estado',
        render: (estado) => {
          let color = 'default';
          if (estado === 'Enviado para Laboratório') {
            color = 'processing';
          } else if (estado === 'Concluído') {
            color = 'success';
          } else if (estado === 'Solicitado') {
            color = 'blue';
          }
          return (
            <Tag color={color}>{estado}</Tag>
          );
        },
      },
      {
        title: 'Ações',
        key: 'acoes',
        render: (_, record) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setExames(exames.filter(exame => exame.id !== record.id));
              message.success('Exame removido');
            }}
          >
            Remover
          </Button>
        ),
      },
    ];

    return (
      <Modal
        title="Solicitar Exames"
        open={exameModalVisible}
        onCancel={(e) => {
          e?.stopPropagation?.();
          setExameModalVisible(false);
        }}
        width={800}
        maskClosable={false}
        keyboard={false}
        footer={[
          <Button 
            key="back" 
            onClick={(e) => {
              e?.stopPropagation?.();
              setExameModalVisible(false);
            }}
          >
            Cancelar
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={(e) => {
              e?.stopPropagation?.();
              handleExameModalFinish();
            }}
            icon={<CheckCircleOutlined />}
            loading={loadingExamesAPI}
            disabled={exames.length === 0}
          >
            Solicitar Exames ao Laboratório
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              // Create a temporary form submit to add exams
              exameForm.validateFields().then(values => {
                adicionarExame(values);
              }).catch(error => {
                console.error("Form validation failed:", error);
              });
            }}
          >
            Adicionar Exame
          </Button>
        </div>

        <Form
          form={exameForm}
          layout="vertical"
          initialValues={{ prioridade: 'Normal', enviarParaLaboratorio: true }}
          style={{ marginBottom: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 8 }}
        >
          <Form.Item
            name="exames"
            label="Selecione os exames"
            rules={[{ required: true, message: 'Por favor, selecione pelo menos um exame' }]}
          >
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Pesquise e selecione exames"
              optionFilterProp="children"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={examOptions}
              maxTagCount={5}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                    <div style={{ display: 'flex' }}>
                      <Input
                        placeholder="Adicionar exame personalizado"
                        value={customExameName}
                        onChange={(e) => setCustomExameName(e.target.value)}
                        style={{ flex: 1, marginRight: '8px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomExame();
                          }
                        }}
                      />
                      <Button type="primary" onClick={addCustomExame} disabled={!customExameName.trim()}>
                        <PlusOutlined /> Adicionar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dataColeta" label="Data de Coleta">
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Selecione a data"
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="prioridade" label="Prioridade">
                <Select>
                  <Option value="Normal">Normal</Option>
                  <Option value="Alto">Alto</Option>
                  <Option value="Urgente">Urgente</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={3} placeholder="Observações adicionais" />
          </Form.Item>

          <Form.Item name="enviarParaLaboratorio" valuePropName="checked">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Checkbox
                checked={enviarParaLaboratorio}
                onChange={(e) => setEnviarParaLaboratorio(e.target.checked)}
              >
                Solicitar Aprovação para Laboratório
              </Checkbox>
            </div>
            {enviarParaLaboratorio && (
              <div style={{
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                <span style={{ color: '#52c41a', marginRight: '5px' }}>
                  <CheckCircleOutlined />
                </span>
                Os exames serão enviados para aprovação e processamento no laboratório
              </div>
            )}
          </Form.Item>
        </Form>

        {exames.length > 0 && (
          <>
            <Divider />
            <h4>Exames Adicionados ({exames.length})</h4>
            <Table
              dataSource={exames}
              columns={exameColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Nenhum exame adicionado' }}
            />
          </>
        )}

        {/* Mostrar exames já existentes no contexto para este paciente */}
        {examesPendentes.filter(e => 
          e.pacienteId === agendamento?.id || 
          e.nid === agendamento?.nid || 
          e.nome === agendamento?.nome
        ).length > 0 && (
          <>
            <Divider />
            <h4>Exames Pendentes no Sistema ({examesPendentes.filter(e => 
              e.pacienteId === agendamento?.id || 
              e.nid === agendamento?.nid || 
              e.nome === agendamento?.nome
            ).length})</h4>
            <div style={{ 
              backgroundColor: '#f0f8ff', 
              border: '1px solid #d6e4ff', 
              padding: '12px', 
              borderRadius: '8px' 
            }}>
              {examesPendentes
                .filter(e => 
                  e.pacienteId === agendamento?.id || 
                  e.nid === agendamento?.nid || 
                  e.nome === agendamento?.nome
                )
                .map(exame => (
                  <div key={exame.id} style={{ marginBottom: '8px' }}>
                    <Tag color="blue">
                      {Array.isArray(exame.examesSolicitados) 
                        ? exame.examesSolicitados.map(ex => typeof ex === 'object' ? (ex.nome || JSON.stringify(ex)) : String(ex)).join(', ')
                        : typeof exame.examesSolicitados === 'object'
                          ? exame.examesSolicitados.nome || 'Exame sem nome'
                          : exame.examesSolicitados
                      }
                    </Tag>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                      Solicitado em: {new Date(exame.dataSolicitacao).toLocaleDateString()}
                    </span>
                  </div>
                ))
              }
            </div>
          </>
        )}
      </Modal>
    );
  };

  const PrescricaoModal = () => {
    const [doseDiaria, setDoseDiaria] = useState(1);
    const [prescricoesTemp, setPrescricoesTemp] = useState([]);

    const handleAddPrescricaoTemp = () => {
      prescricaoForm.validateFields().then(values => {
        // Coleta os horários conforme a quantidade de doses
        const horarios = [];
        for (let i = 1; i <= doseDiaria; i++) {
          if (values[`hora${i}`]) {
            horarios.push(values[`hora${i}`].format('HH:mm'));
          }
        }

        const novaPrescricao = {
          id: Date.now(),
          medicamento: values.medicamento,
          quantidade: values.quantidade,
          unidade: values.unidade,
          viaAdministracao: values.viaAdministracao,
          doseDiaria: values.doseDiaria,
          numeroDias: values.numeroDias,
          horarios: horarios,
          comentario: values.comentario,
          dosagem: `${values.quantidade} ${values.unidade} - ${values.doseDiaria}x ao dia`
        };

        setPrescricoesTemp([...prescricoesTemp, novaPrescricao]);
        prescricaoForm.resetFields();
        setDoseDiaria(1);
        message.success('Prescrição adicionada à lista temporária');
      }).catch(errorInfo => {
      });
    };

    const handleConfirmPrescricoes = () => {
      setPrescricoes([...prescricoes, ...prescricoesTemp]);
      setPrescricoesTemp([]);
      message.success('Prescrições confirmadas com sucesso');
    };

    const handlePrescricaoModalFinish = () => {
      // Confirm any pending prescriptions first
      if (prescricoesTemp.length > 0) {
        handleConfirmPrescricoes();
      }

      // Apenas fechar o modal - NÃO finalizar a consulta aqui
      // A finalização será feita pelo botão "Salvar Consulta" que chamará handleFinish
      setPrescricaoModalVisible(false);
      message.success({
        content: `${prescricoes.length + prescricoesTemp.length} prescrição(ões) adicionada(s). Clique em "Salvar Consulta" para finalizar.`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
    };

    const prescricaoColumns = [
      {
        title: 'Medicamento',
        dataIndex: 'medicamento',
        key: 'medicamento',
        render: (text) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      },
      {
        title: 'Dosagem',
        dataIndex: 'dosagem',
        key: 'dosagem',
        render: (text, record) => (
          <div>
            <div>{`${record.quantidade} ${record.unidade}, ${record.doseDiaria}x ao dia, ${record.numeroDias} dias`}</div>
            {record.horarios && record.horarios.length > 0 && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                <span style={{ color: '#1890ff', marginRight: '4px' }}>Horários:</span>
                {record.horarios.join(', ')}
              </div>
            )}
            {record.comentario && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                <span style={{ color: '#1890ff', marginRight: '4px' }}>Nota:</span>
                {record.comentario}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Via',
        dataIndex: 'viaAdministracao',
        key: 'viaAdministracao',
        render: (text) => {
          let color = 'blue';
          if (text === 'Oral') color = 'green';
          if (text === 'Intravenosa') color = 'red';
          if (text === 'Intramuscular') color = 'orange';
          if (text === 'Subcutânea') color = 'purple';
          if (text === 'Tópica') color = 'cyan';
          return <Tag color={color}>{text}</Tag>;
        }
      },
      {
        title: 'Ações',
        key: 'acoes',
        render: (_, record) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              // Remove from temporary list if it exists there
              if (prescricoesTemp.find(p => p.id === record.id)) {
                setPrescricoesTemp(prescricoesTemp.filter(p => p.id !== record.id));
              } else {
                setPrescricoes(prescricoes.filter(p => p.id !== record.id));
              }
              message.success('Prescrição removida');
            }}
          >
            Remover
          </Button>
        ),
      },
    ];

    return (
      <Modal
        title="Prescrição Médica"
        open={prescricaoModalVisible}
        onCancel={() => {
          setPrescricaoModalVisible(false);
          setPrescricoesTemp([]);
        }}
        width={800}
        footer={[
          <Button key="back" onClick={() => {
            setPrescricaoModalVisible(false);
            setPrescricoesTemp([]);
          }}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handlePrescricaoModalFinish}
            disabled={prescricoes.length === 0 && prescricoesTemp.length === 0}
            icon={<CheckCircleOutlined />}
          >
            Salvar e Voltar à Consulta
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddPrescricaoTemp}
          >
            Adicionar Prescrição
          </Button>
        </div>

        <Form
          form={prescricaoForm}
          layout="vertical"
          initialValues={{ doseDiaria: 1, viaAdministracao: 'Oral' }}
          style={{ marginBottom: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 8 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="medicamento"
                label="Medicamento"
                rules={[{ required: true, message: 'Campo obrigatório' }]}
              >
                <Input placeholder="Nome do medicamento" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="quantidade"
                label="Quantidade"
                rules={[{ required: true, message: 'Campo obrigatório' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="unidade"
                label="Unidade"
                rules={[{ required: true, message: 'Campo obrigatório' }]}
              >
                <Select>
                  <Option value="mg">mg</Option>
                  <Option value="g">g</Option>
                  <Option value="ml">ml</Option>
                  <Option value="comprimido">comprimido</Option>
                  <Option value="cápsula">cápsula</Option>
                  <Option value="gotas">gotas</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="viaAdministracao" label="Via de Administração">
                <Select>
                  <Option value="Oral">Oral</Option>
                  <Option value="Intramuscular">Intramuscular</Option>
                  <Option value="Intravenosa">Intravenosa</Option>
                  <Option value="Subcutânea">Subcutânea</Option>
                  <Option value="Tópica">Tópica</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="doseDiaria" label="Doses por dia">
                <InputNumber
                  min={1}
                  max={6}
                  value={doseDiaria}
                  onChange={(value) => setDoseDiaria(value || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="numeroDias" label="Número de dias">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            {Array.from({ length: doseDiaria }, (_, i) => (
              <Col span={24 / doseDiaria} key={i}>
                <Form.Item name={`hora${i + 1}`} label={`Horário ${i + 1}`}>
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item name="comentario" label="Comentários/Instruções">
            <Input.TextArea rows={3} placeholder="Instruções especiais" />
          </Form.Item>
        </Form>

        {(prescricoes.length > 0 || prescricoesTemp.length > 0) && (
          <>
            <Divider />
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Prescrições ({prescricoes.length + prescricoesTemp.length})</h4>
              {prescricoesTemp.length > 0 && (
                <div style={{ fontSize: '14px' }}>
                  <Tag color="blue" style={{ marginRight: '8px' }}>
                    {prescricoesTemp.length} temporária(s)
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleConfirmPrescricoes}
                  >
                    Confirmar Temporárias
                  </Button>
                </div>
              )}
            </div>
            <Table
              dataSource={[...prescricoes, ...prescricoesTemp]}
              columns={prescricaoColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Nenhuma prescrição adicionada' }}
              rowClassName={(record) => 
                prescricoesTemp.find(p => p.id === record.id) ? 'table-row-temp' : ''
              }
            />
          </>
        )}
        
        <style jsx>{`
          .table-row-temp {
            background-color: #fff7e6 !important;
            border-left: 3px solid #fa8c16;
          }
        `}</style>
      </Modal>
    );
  };

  // Funções para o histórico do paciente
  const abrirHistorico = () => {
    setHistoricoVisivel(true);
  };

  const fecharHistorico = () => {
    setHistoricoVisivel(false);
  };

  const imprimirHistorico = () => {
    if (!agendamento) return;

    const eventos = historicoPaciente();
    const content = `
      <html>
        <head>
          <title>Histórico Médico - ${agendamento.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1, h2 { color: #1890ff; }
            .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
            .evento { margin-bottom: 20px; border: 1px solid #f0f0f0; padding: 15px; }
            .tipo { font-weight: bold; font-size: 18px; color: #1890ff; }
            .data { color: #666; }
            .descricao { white-space: pre-line; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Histórico Médico Completo</h1>
            <p><strong>Paciente:</strong> ${agendamento.nome}</p>
            <p><strong>Documento:</strong> ${agendamento.apelido || 'N/A'}</p>
            <p><strong>Data Emissão:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${eventos.map(evento => `
            <div class="evento">
              <div class="tipo">${evento.tipo}</div>
              <div class="data">${evento.data}</div>
              <div class="descricao">${evento.descricao.replace(/\n/g, '<br>')}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };  const historicoPaciente = () => {
    if (!agendamento) return [];

    // Estratégia múltipla para identificar o paciente corretamente
    const nid = agendamento.nid;
    const pacienteId = agendamento.pacienteId || agendamento.id;
    const nomePaciente = agendamento.nome;    // Filtra as triagens do paciente usando múltiplos critérios e comparações adicionais
    const triagensPaciente = Array.isArray(triagensRealizadas) ? triagensRealizadas.filter(t => {
      return (t.nid === nid || 
             t.nome === nomePaciente ||
             (t.pacienteId && String(t.pacienteId) === String(pacienteId)) ||
             (t.id && String(t.id) === String(pacienteId)) ||
             (agendamento.exameId && t.id && String(t.id) === String(agendamento.exameId)));
    }) : [];    // Filtra as consultas do paciente usando múltiplos critérios e comparações adicionais
    const consultasPaciente = Array.isArray(consultasRealizadas) ? consultasRealizadas.filter(c => {
      return (c.nid === nid || 
             c.nome === nomePaciente ||
             (c.pacienteId && String(c.pacienteId) === String(pacienteId)) ||
             (c.id && String(c.id) === String(pacienteId)) ||
             (agendamento.exameId && c.exameId && String(c.exameId) === String(agendamento.exameId)));
    }) : [];    // Filtra os exames do paciente usando múltiplos critérios e comparações adicionais
    const examesPaciente = Array.isArray(triagensRealizadas) ? triagensRealizadas.filter(e => {
      return ((e.nid === nid || 
              e.nome === nomePaciente ||
              (e.pacienteId && String(e.pacienteId) === String(pacienteId)) ||
              (e.id && String(e.id) === String(pacienteId)) ||
              (agendamento.exameId && e.id && String(e.id) === String(agendamento.exameId)))) &&
             e.tipoTriagem === 'exames';
    }) : [];

    const eventos = [];

    // Adicionar triagens ao histórico
    triagensPaciente
      .filter(t => t.tipoTriagem !== 'exames') // Excluir exames, que serão processados separadamente
      .forEach(t => {
        eventos.push({
          tipo: 'Triagem',
          categoria: 'triagem',
          descricao: `
          Peso: ${t.peso || '-'}kg,
          Pressão Arterial: ${t.pressaoArterial || '-'},
          Frequência Cardíaca: ${t.frequenciaCardiaca || '-'} bpm,
          Oximetria: ${t.oximetria || '-'}%,
          Glicose Capilar: ${t.glicoseCapilar || '-'} mg/dL,
          Altura: ${t.altura || '-'} m,
          Temperatura: ${t.temperatura || '-'} °C,
          Observações: ${t.observacoes || 'Nenhuma'}
        `,
          data: t.dataTriagem,
          dadosCompletos: t
        });
      });

    // Adicionar consultas ao histórico
    consultasPaciente.forEach(c => {
      eventos.push({
        tipo: 'Consulta Médica',
        categoria: 'consulta',
        descricao: `
          Especialidade: ${c.especialidade || '-'},
          Médico: ${c.medico || c.medicoNome || '-'},
          Diagnóstico: ${c.diagnostico || '-'},
          Medicamentos: ${(() => {
            if (!c.medicamentos) return 'Nenhum';
            if (typeof c.medicamentos === 'string') return c.medicamentos;
            if (Array.isArray(c.medicamentos)) {
              return c.medicamentos
                .map(med => typeof med === 'object' ? (med.medicamento || med.nome || 'Medicamento sem nome') : med)
                .join(', ');
            }
            return 'Nenhum';
          })()},
          Exames Solicitados: ${(() => {
            if (!c.examesSolicitados) return 'Nenhum';
            if (typeof c.examesSolicitados === 'string') return c.examesSolicitados;
            if (Array.isArray(c.examesSolicitados)) {
              return c.examesSolicitados
                .map(exame => {
                  if (typeof exame === 'object' && exame !== null) {
                    return exame.nome || JSON.stringify(exame);
                  }
                  return String(exame);
                })
                .join(', ');
            }
            if (typeof c.examesSolicitados === 'object' && c.examesSolicitados !== null) {
              return c.examesSolicitados.nome || JSON.stringify(c.examesSolicitados);
            }
            return 'Nenhum';
          })()},
          Recomendações: ${c.recomendacoes || 'Nenhuma'},
          Observações: ${c.observacoes || 'Nenhuma'}
        `,
        data: c.dataConsulta,
        dadosCompletos: c
      });
    });

    // Adicionar exames ao histórico
    examesPaciente.forEach(e => {
      const resultados = e.resultadosExames ?
        formatarResultadoExame(e.resultadosExames) :
        'Nenhum resultado registrado';

      eventos.push({
        tipo: 'Exames Laboratoriais',
        categoria: 'exame',
        descricao: `
          Resultados: ${resultados}
          Observações: ${e.observacoes || 'Nenhuma'}
        `,
        data: e.dataExames,
        dadosCompletos: e
      });
    });    // Ordenar eventos pela data (mais recentes primeiro)
    return eventos.sort((a, b) => {
      // Garantir que as datas sejam tratadas corretamente, mesmo se forem strings
      const dateA = a.data ? new Date(a.data) : new Date(0);
      const dateB = b.data ? new Date(b.data) : new Date(0);
      return dateB - dateA;
    });
  };

  // Render helper functions para o histórico
  const renderTriagem = (triagem) => (
    <Descriptions bordered column={1} size="small">
      {triagem.peso && <Descriptions.Item label="Peso">{triagem.peso} kg</Descriptions.Item>}
      {triagem.altura && <Descriptions.Item label="Altura">{triagem.altura} m</Descriptions.Item>}
      {triagem.pressaoArterial && <Descriptions.Item label="Pressão Arterial">{triagem.pressaoArterial}</Descriptions.Item>}
      {triagem.frequenciaCardiaca && <Descriptions.Item label="Frequência Cardíaca">{triagem.frequenciaCardiaca} bpm</Descriptions.Item>}
      {triagem.temperatura && <Descriptions.Item label="Temperatura">{triagem.temperatura} °C</Descriptions.Item>}
      {triagem.oximetria && <Descriptions.Item label="Oximetria">{triagem.oximetria}%</Descriptions.Item>}
      {triagem.glicoseCapilar && <Descriptions.Item label="Glicose Capilar">{triagem.glicoseCapilar} mg/dL</Descriptions.Item>}
      {triagem.observacoes && <Descriptions.Item label="Observações">{triagem.observacoes}</Descriptions.Item>}
    </Descriptions>
  );  const renderConsulta = (consulta) => (
    <Descriptions bordered column={1} size="small">
      {consulta.especialidade && <Descriptions.Item label="Especialidade">{consulta.especialidade}</Descriptions.Item>}
      {consulta.medico && <Descriptions.Item label="Médico">{consulta.medico}</Descriptions.Item>}
      {consulta.medicoNome && <Descriptions.Item label="Médico">{consulta.medicoNome}</Descriptions.Item>}
      {consulta.diagnostico && <Descriptions.Item label="Diagnóstico">{consulta.diagnostico}</Descriptions.Item>}      {consulta.status === 'obito' && (
        <>
          <Descriptions.Item label="Status" labelStyle={{ fontWeight: 'bold', color: '#ff4d4f' }}>
            <Tag color="red" style={{ fontSize: '14px', padding: '2px 8px' }}>Óbito</Tag>
          </Descriptions.Item>
          {consulta.causaMorte && (
            <Descriptions.Item label="Causa da Morte" labelStyle={{ fontWeight: 'bold' }}>
              <div style={{ color: '#ff4d4f' }}>{consulta.causaMorte}</div>
            </Descriptions.Item>
          )}
          {consulta.dataObito && (
            <Descriptions.Item label="Data do Óbito" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.dataObito}{consulta.horaObito ? ` às ${consulta.horaObito}` : ''}</div>
            </Descriptions.Item>
          )}
          {consulta.observacoesObito && (
            <Descriptions.Item label="Observações do Óbito" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.observacoesObito}</div>
            </Descriptions.Item>
          )}
        </>
      )}
      {consulta.status === 'transferido' && (
        <>
          <Descriptions.Item label="Status" labelStyle={{ fontWeight: 'bold', color: '#1890ff' }}>
            <Tag color="blue" style={{ fontSize: '14px', padding: '2px 8px' }}>Transferido</Tag>
          </Descriptions.Item>
          {consulta.hospitalDestino && (
            <Descriptions.Item label="Hospital de Destino" labelStyle={{ fontWeight: 'bold' }}>
              <div style={{ color: '#1890ff' }}>{consulta.hospitalDestino}</div>
            </Descriptions.Item>
          )}
          {consulta.motivoTransferencia && (
            <Descriptions.Item label="Motivo da Transferência" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.motivoTransferencia}</div>
            </Descriptions.Item>
          )}
          {consulta.dataTransferencia && (
            <Descriptions.Item label="Data da Transferência" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.dataTransferencia}</div>
            </Descriptions.Item>
          )}
          {consulta.observacoesTransferencia && (
            <Descriptions.Item label="Observações da Transferência" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.observacoesTransferencia}</div>
            </Descriptions.Item>
          )}
        </>
      )}
      {consulta.medicamentos && consulta.medicamentos.length > 0 && (
        <Descriptions.Item label="Medicamentos">
          <ul>
            {consulta.medicamentos.map((med, idx) => (
              <li key={idx}>{typeof med === 'object' ? (med.medicamento || med.nome || 'Medicamento sem nome') : med}</li>
            ))}
          </ul>
        </Descriptions.Item>
      )}
      {consulta.examesSolicitados && consulta.examesSolicitados.length > 0 && (
        <Descriptions.Item label="Exames Solicitados">
          <ul>
            {consulta.examesSolicitados.map((exame, idx) => (
              <li key={idx}>{typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}</li>
            ))}
          </ul>
        </Descriptions.Item>
      )}
      {consulta.recomendacoes && <Descriptions.Item label="Recomendações">{consulta.recomendacoes}</Descriptions.Item>}
      {consulta.observacoes && <Descriptions.Item label="Observações">{consulta.observacoes}</Descriptions.Item>}
    </Descriptions>
  );
  const renderExame = (exame) => {
    // Safety check to ensure exame is a valid object
    if (!exame || typeof exame !== 'object') {
      return (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Erro">Dados de exame inválidos</Descriptions.Item>
        </Descriptions>
      );
    }
    
    return (
      <Descriptions bordered column={1} size="small">
        {exame.resultadosExames && (
          <Descriptions.Item label="Resultados">
            <div style={{ whiteSpace: 'pre-line' }}>
              {formatarResultadoExame(exame.resultadosExames)}
            </div>
          </Descriptions.Item>
        )}
        {exame.observacoes && <Descriptions.Item label="Observações">{exame.observacoes}</Descriptions.Item>}
        {exame.dataExames && <Descriptions.Item label="Data dos Exames">{new Date(exame.dataExames).toLocaleString()}</Descriptions.Item>}
      </Descriptions>
    );
  };  const renderHistoricoTimeline = () => {
    const eventos = historicoPaciente();

    if (eventos.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Não há histórico disponível para este paciente.</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Identificadores do paciente: NID: {agendamento?.nid || 'Não informado'}, 
            Nome: {agendamento?.nome || 'Não informado'}
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
            Total de registros disponíveis no sistema: 
            Triagens: 0,
            Consultas: 0
          </p>
        </div>
      );
    }

    return (
      <Timeline mode="left">
        {eventos.map((item, index) => {
          let color;
          let icon;          switch (item.categoria) {
            case 'triagem':
              color = 'blue';
              icon = <HeartOutlined />;
              break;
            case 'consulta':
              // Check if this is an óbito record or transferência record
              if (item.dadosCompletos && item.dadosCompletos.status === 'obito') {
                color = 'red';
                icon = <StopOutlined />;
              } else if (item.dadosCompletos && item.dadosCompletos.status === 'transferido') {
                color = 'purple';
                icon = <SendOutlined />;
              } else {
                color = 'green';
                icon = <MedicineBoxOutlined />;
              }
              break;
            case 'exame':
              color = 'purple';
              icon = <ExperimentOutlined />;
              break;
            default:
              color = 'gray';
              icon = <FileTextOutlined />;
          }

          return (
            <Timeline.Item
              key={index}
              color={color}
              dot={icon}
              label={typeof item.data === 'object' && item.data.format
                ? item.data.format('DD/MM/YYYY HH:mm')
                : new Date(item.data).toLocaleString()}
            >              <Card
                title={
                  <span style={{ fontWeight: 'bold' }}>
                    {item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'obito' ? (
                      <span>
                        {item.tipo} <Tag color="red">Óbito</Tag>
                      </span>
                    ) : item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'transferido' ? (
                      <span>
                        {item.tipo} <Tag color="purple">Transferido</Tag>
                      </span>
                    ) : (
                      item.tipo
                    )}
                  </span>
                }
                size="small"
                style={{ 
                  marginBottom: 16,
                  ...(item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'obito' ? 
                    { borderColor: '#ff4d4f' } : {}),
                  ...(item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'transferido' ? 
                    { borderColor: '#722ed1' } : {})
                }}
              >
                {item.categoria === 'triagem' && renderTriagem(item.dadosCompletos)}
                {item.categoria === 'consulta' && renderConsulta(item.dadosCompletos)}
                {item.categoria === 'exame' && renderExame(item.dadosCompletos)}
              </Card>
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };  const renderTriagensTab = () => {
    console.log('🎨 Renderizando tab de triagens');
    const eventos = historicoPaciente();
    console.log('📊 Eventos totais:', eventos.length);
    const triagens = eventos.filter(e => e && e.categoria === 'triagem');
    console.log('📊 Triagens filtradas:', triagens.length);

    if (triagens.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Não há triagens registradas para este paciente.</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Identificadores do paciente: NID: {agendamento?.nid || 'Não informado'}, 
            Nome: {agendamento?.nome || 'Não informado'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {triagens.map((item, index) => (
          <Card
            key={index}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Triagem</span>
                <Tag color="blue">{new Date(item.data).toLocaleString()}</Tag>
              </div>
            }
            style={{ marginBottom: 10 }}
          >
            {renderTriagem(item.dadosCompletos)}
          </Card>
        ))}
      </div>
    );
  };  const renderConsultasTab = () => {
    console.log('🎨 Renderizando tab de consultas');
    const eventos = historicoPaciente();
    const consultas = eventos.filter(e => e && e.categoria === 'consulta');

    if (consultas.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Não há consultas registradas para este paciente.</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Identificadores do paciente: NID: {agendamento?.nid || 'Não informado'}, 
            Nome: {agendamento?.nome || 'Não informado'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {consultas.map((item, index) => (
          <Card
            key={index}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Consulta Médica</span>
                <Tag color="green">{new Date(item.data).toLocaleString()}</Tag>
              </div>
            }
            style={{ marginBottom: 10 }}
          >
            {renderConsulta(item.dadosCompletos)}
          </Card>
        ))}
      </div>
    );
  };  const renderExamesTab = () => {
    const eventos = historicoPaciente();
    const exames = eventos.filter(e => e && e.categoria === 'exame');

    if (exames.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Não há exames registrados para este paciente.</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Identificadores do paciente: NID: {agendamento?.nid || 'Não informado'}, 
            Nome: {agendamento?.nome || 'Não informado'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {Array.isArray(exames) && exames.filter(item => item && typeof item === 'object').map((item, index) => (
          <Card
            key={index}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Exames Laboratoriais</span>
                <Tag color="purple">
                  {item.data ? new Date(item.data).toLocaleString() : 'Data não disponível'}
                </Tag>
              </div>
            }
            style={{ marginBottom: 10 }}
          >
            {renderExame(item.dadosCompletos || item)}
          </Card>
        ))}
      </div>
    );
  };
  
  // Render helper functions
  const renderPatientDataCard = () => (    <Card 
      title={
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span>Dados do Paciente</span>
        </Space>
      } 
      className="card-with-shadow"
      style={{ 
        borderRadius: '8px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.09)', 
        padding: '12px',
        height: 'calc(100% - 16px)' // Faz o card ocupar quase toda a altura disponível
      }}
    >
      <Form 
        layout="horizontal" 
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label="Nome" 
              labelAlign="left"
              style={{ marginBottom: 8 }}

            >
              <Input 
                readOnly 
                value={agendamento?.nome || 'N/A'} 
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item 
              label="Apelido" 
              labelAlign="left"
              style={{ marginBottom: 8 }}

            >
              <Input 
                readOnly 
                value={agendamento?.apelido || 'N/A'} 
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item 
              label="NID" 
              labelAlign="left"
              style={{ marginBottom: 8 }}

            >
              <Input 
                readOnly 
                value={agendamento?.nid || 'N/A'}
                prefix={<Badge status="processing" />}
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item 
              label="Gênero" 
              labelAlign="left"
              style={{ marginBottom: 8 }}

            >
              <Input 
                readOnly 
                value={agendamento?.genero || 'N/A'} 
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={16}>
            <Form.Item 
              label="Tipo de Consulta" 
              labelAlign="left"
              style={{ marginBottom: 8 }}

            >
              <Input 
                readOnly 
                value={agendamento?.tipoConsulta || 'Consulta Normal'}
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        {agendamento?.motivo && (
          <Row>
            <Col span={24}>
              <Form.Item 
                label="Motivo" 
                labelAlign="left"
                style={{ marginBottom: 8 }}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 20 }}
              >
                <Input.Input 
                  readOnly 
                  value={agendamento.motivo} 
                  style={{ backgroundColor: '#f5f5f5', color: 'rgba(0, 0, 0, 0.45)' }}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
          <Row>
          <Col span={24}>
            <Form.Item style={{ marginTop: 8, marginBottom: 8 }}>              <Button 
                type="default"
                icon={<HistoryOutlined />} 
                onClick={abrirHistorico} 
                block
                size="middle"
                style={{ 
                  borderRadius: '6px',
                  height: '30px',
                  boxShadow: '0 2px 0 rgba(0,0,0,0.02)'
                }}
              >
                Ver Histórico do Paciente
              </Button>
            </Form.Item>
          </Col>
        </Row>
          <Row gutter={[8, 0]}>
          <Col span={12}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                icon={<ExperimentOutlined />}
                onClick={handleExames}
                block
                size="middle"
                style={{ 
                  backgroundColor: '#1890ff', 
                  borderColor: '#1890ff',
                  height: '30px',
                  borderRadius: '6px'
                }}
              >
                Exames
              </Button>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                icon={<MedicineBoxOutlined />}
                onClick={handlePrescricoes}
                block
                size="middle"
                style={{ 
                  backgroundColor: '#52c41a', 
                  borderColor: '#52c41a',
                  height: '30px',
                  borderRadius: '6px'
                }}
              >
                Prescrições
              </Button>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                danger 
                icon={<StopOutlined />}
                onClick={handleObito}
                block
                size="middle"
                style={{ 
                  height: '30px',
                  borderRadius: '6px'
                }}
              >
                Declarar Óbito
              </Button>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleTransferir}
                block
                size="middle"
                style={{ 
                  backgroundColor: '#722ed1', 
                  borderColor: '#722ed1',
                  height: '30px',
                  borderRadius: '6px'
                }}
              >
                Transferir
              </Button>
            </Form.Item>
          </Col>
        </Row>

      </Form>    </Card>
  );



  const renderConsultaForm = () => (
    <Form 
      form={form} 
      layout="vertical" 
      onFinish={handleFinish}
      requiredMark="optional"
      style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <Form.Item
        name="historico"
        label={<span><FileTextOutlined /> Histórico</span>}
      >
        <Input 
          rows={2} 
          placeholder="Histórico do paciente" 
          style={{ borderRadius: '4px' }}
        />
      </Form.Item>
      
      <Form.Item
        name="sintomas"
        label={<span><MedicineBoxOutlined /> Sintomas</span>}
        rules={[{ required: true, message: 'Por favor, informe os sintomas' }]}
      >
        <Input.TextArea
          rows={3} 
          placeholder="Sintomas relatados pelo paciente" 
          style={{ borderRadius: '4px' }}
        />
      </Form.Item>
      
      <Form.Item
        name="diagnostico"
        label={<span><MedicineBoxTwoTone /> Diagnóstico</span>}
        rules={[{ required: true, message: 'Por favor, informe o diagnóstico' }]}
      >
        <Input 
          rows={3} 
          placeholder="Diagnóstico médico" 
          style={{ borderRadius: '4px' }}
        />
      </Form.Item>
      
      <Form.Item
        name="recomendacoes"
        label={<span><CheckCircleOutlined /> Recomendações</span>}
      >
        <Input 
          rows={3} 
          placeholder="Recomendações e prescrições" 
          style={{ borderRadius: '4px' }}
        />      </Form.Item>
      
      {/* Data indicators */}
      {((agendamento?.prescricoes?.length > 0 || prescricoes.length > 0) || (agendamento?.exames?.length > 0 || exames.length > 0)) && (
        <div style={{ 
          marginBottom: 16, 
          padding: '8px 12px', 
          background: '#f0f8ff', 
          border: '1px solid #d6e4ff',
          borderRadius: '4px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
            <MedicineBoxOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
            Dados associados a esta consulta:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {((agendamento?.prescricoes?.length > 0) || prescricoes.length > 0) && (
              <Tag color="green">
                {(agendamento?.prescricoes?.length || 0) + prescricoes.length} Prescrição(ões)
                <span style={{ marginLeft: '4px', fontSize: '10px' }}>✓ Termina ciclo</span>
              </Tag>
            )}
            {((agendamento?.exames?.length > 0) || exames.length > 0) && (
              <Tag color="blue">
                {(agendamento?.exames?.length || 0) + exames.length} Exame(s)
                <span style={{ marginLeft: '4px', fontSize: '10px' }}>⚠ Não termina ciclo</span>
              </Tag>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            {prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0) 
              ? '✓ Esta consulta finalizará o ciclo do paciente (paciente será removido da lista)'
              : '⚠ Esta consulta será salva mas o paciente permanecerá na lista para prescrições futuras'
            }
          </div>
        </div>
      )}

      <Form.Item style={{ textAlign: 'right', marginTop: 16 }}>
        <Space>
          {((agendamento?.prescricoes?.length > 0 || prescricoes.length > 0) || (agendamento?.exames?.length > 0 || exames.length > 0)) && (
            <div style={{ 
              textAlign: 'left', 
              padding: '8px 12px', 
              backgroundColor: prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0) ? '#f6ffed' : '#fff7e6',
              border: `1px solid ${prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0) ? '#b7eb8f' : '#ffd666'}`,
              borderRadius: '4px',
              marginRight: '20px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                <CheckCircleOutlined style={{ 
                  color: prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0) ? '#52c41a' : '#fa8c16', 
                  marginRight: '8px' 
                }} />
                {prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0) 
                  ? 'Consulta completa - Ciclo será finalizado' 
                  : 'Consulta com exames - Ciclo permanece aberto'
                }
              </div>
              <div style={{ fontSize: '12px', color: '#555' }}>
                {prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0)
                  ? 'Paciente será removido da lista após salvar.'
                  : 'Paciente permanecerá na lista para prescrições futuras.'
                }
              </div>
            </div>
          )}
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<MedicineBoxOutlined />}
            size="large"
            style={{ 
              borderRadius: '6px',
              height: '44px',
              padding: '0 24px'
            }}
          >
            {prescricoes.length > 0 || (agendamento?.prescricoes?.length > 0)
              ? 'Salvar e Finalizar Ciclo'
              : 'Salvar Consulta'
            }
          </Button>        </Space>
      </Form.Item>
    </Form>
  );  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MedicineBoxTwoTone style={{ fontSize: '24px', marginRight: '12px' }} />
            <span>Consulta Médica - {agendamento?.paciente?.nome || agendamento?.nome || 'Paciente'}</span>
          </div>        }
        open={open}
        onCancel={onCancel}
        width={1000}
        footer={null}
        destroyOnClose
        bodyStyle={{ padding: '12px 24px' }}
        className="consulta-detalhada-modal"
      >        
        <Row gutter={[16, 16]}>
          {/* Coluna Esquerda - Formulário de Consulta */}
          <Col span={12}>
            {renderConsultaForm()}
          </Col>

          {/* Coluna Direita - Dados do Paciente */}
          <Col span={12}>
            {renderPatientDataCard()}
          </Col>
        </Row>

        {/* Indicador de exames disponíveis */}
        {agendamento?.resultadosExames && Object.keys(agendamento.resultadosExames).length > 0 && (
          <div style={{ 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            padding: '8px 12px', 
            borderRadius: '4px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px', fontSize: '16px' }} />
            <div>
              <div style={{ fontWeight: 'bold' }}>Exames Disponíveis</div>
              <div style={{ fontSize: '12px' }}>
                Este paciente possui resultados de exames disponíveis para análise.
              </div>
            </div>
          </div>
        )}
      </Modal>
        {/* Alta Modal */}
      <AltaModal 
        open={altaModalVisible} 
        onCancel={handleAltaModalCancel}
        paciente={agendamento}
      />      {/* Óbito Modal */}
      <ObitoModal 
        open={obitoModalVisible} 
        onCancel={handleObitoModalCancel}
        paciente={agendamento}
        onFinish={(obitoData) => handleObitoModalCancel(true, obitoData)}
      />

      {/* Transferência Modal */}
      <TransferenciaModal 
        open={transferenciaModalVisible} 
        onCancel={handleTransferenciaModalCancel}
        paciente={agendamento}
        onFinish={(transferenciaData) => handleTransferenciaModalCancel(true, transferenciaData)}
      />

      {/* Modal de Histórico Clínico */}<Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Histórico Clínico - {agendamento?.nome || 'Paciente'}</span>
            <Space>
              <Button
                icon={<PrinterOutlined />}
                onClick={imprimirHistorico}
                disabled={!agendamento}
              >
                Imprimir Histórico
              </Button>
              <Button
                type="text"
                size="small"
                onClick={() => {



                }}
              >
              </Button>
            </Space>
          </div>
        }
        open={historicoVisivel}
        onCancel={fecharHistorico}
        footer={null}
        width={800}
      >
        {agendamento && (
          <>
            <Card style={{ marginBottom: 16 }}>              <Descriptions title="Informações do Paciente" bordered column={2}>
                <Descriptions.Item label="NID" span={2}>{agendamento.nid}</Descriptions.Item>
                <Descriptions.Item label="Nome" span={2}>{agendamento.nome}</Descriptions.Item>
                <Descriptions.Item label="Apelido" span={2}>{agendamento.apelido || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Data de Nascimento" span={2}>
                  {agendamento.dataNascimento
                    ? (typeof agendamento.dataNascimento === 'object' && agendamento.dataNascimento.format
                      ? agendamento.dataNascimento.format('DD/MM/YYYY')
                      : new Date(agendamento.dataNascimento).toLocaleDateString())
                    : 'Não informado'}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo de Utente" span={2}>{agendamento.tipoUtente || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Telefone" span={2}>{agendamento.celular || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>{agendamento.email || 'N/A'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Divider />

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane
                tab={<span><FileTextOutlined /> Linha do Tempo</span>}
                key="timeline"
              >
                {renderHistoricoTimeline()}
              </TabPane>
              <TabPane
                tab={<span><HeartOutlined /> Triagens</span>}
                key="triagens"
              >
                {renderTriagensTab()}
              </TabPane>
              <TabPane
                tab={<span><MedicineBoxOutlined /> Consultas</span>}
                key="consultas"
              >
                {renderConsultasTab()}
              </TabPane>
              <TabPane
                tab={<span><ExperimentOutlined /> Exames</span>}
                key="exames"
              >
                {renderExamesTab()}
              </TabPane>
            </Tabs>
          </>
        )}
      </Modal>

      {/* Novos Modals - Exames e Prescrições */}
      {exameModalVisible && <ExameModal />}
      {prescricaoModalVisible && <PrescricaoModal />}
    </>
  );
};

export default ConsultaDetalhadaModal;