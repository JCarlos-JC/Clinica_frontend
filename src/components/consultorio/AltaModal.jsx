import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Button,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  TimePicker,
  Space,
  message,
  Tag,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import './AltaModal.css'; // Will create this file next

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Componente Modal de Alta com abas para Exames e Prescrições
 */
const AltaModal = ({ open, onCancel, paciente, onFinish }) => {
  // Estado para controlar as abas
  const [activeTab, setActiveTab] = useState('1');

  // Estados para os modais secundários
  const [exameModalVisible, setExameModalVisible] = useState(false);
  const [prescricaoModalVisible, setPrescricaoModalVisible] = useState(false);

  // Estados para armazenar os dados
  const [exames, setExames] = useState([]);
  const [prescricoes, setPrescricoes] = useState([]);

  // Forms
  const [exameForm] = Form.useForm();
  const [prescricaoForm] = Form.useForm();

  // Reset states when modal is opened or closed
  useEffect(() => {
    if (open) {
      // Reset to initial state when modal is opened
      setActiveTab('1');
      setExames([]);
      setPrescricoes([]);
    }
  }, [open]);

  // Manipuladores de eventos
  const handleTabChange = (key) => {
    setActiveTab(key);
  }; const handleExameDelete = (exameId) => {
    setExames(exames.filter(exame => exame.id !== exameId));
    message.success('Exame removido com sucesso');
  };

  const handlePrescricaoDelete = (prescricaoId) => {
    setPrescricoes(prescricoes.filter(prescricao => prescricao.id !== prescricaoId));
    message.success('Prescrição removida com sucesso');
  };
  const adicionarMultiplosExames = (values) => {
    // Se não houver exames selecionados
    if (!values.exames || values.exames.length === 0) {
      message.error('Por favor, selecione pelo menos um exame.');
      return;
    }

    // Data de coleta e prioridade
    const { dataColeta, prioridade, observacoes } = values;

    // Criar objetos de exame para cada exame selecionado
    const timestamp = Date.now();
    const novosExames = values.exames.map((exame, index) => ({
      id: timestamp + index,
      nome: exame,
      dataColeta: dataColeta.format('DD/MM/YYYY'),
      observacoes: observacoes,
      prioridade: prioridade || 'Normal',
      estado: values.enviarParaLaboratorio ? 'Enviado para Laboratório' : 'Aguardando'
    }));

    // Adiciona os exames à lista local
    setExames([...exames, ...novosExames]);
    if (values.enviarParaLaboratorio) {
      message.success(`${values.exames.length} exame(s) preparado(s) para envio ao laboratório pelo backend.`);
    }
    exameForm.resetFields();
    setExameModalVisible(false);
    message.success(`${novosExames.length} exame(s) adicionado(s) com sucesso`);
  }; const handleFinish = () => {
    // Verificar se há exames enviados ao laboratório
    const examesLaboratorio = exames.filter(exame => exame.estado === 'Enviado para Laboratório');

    if (examesLaboratorio.length > 0) {
      message.success({
        content: `${examesLaboratorio.length} exame(s) enviado(s) para o Laboratório`,
        icon: <MedicineBoxOutlined style={{ color: '#1890ff' }} />
      });
    }

    // Preparar os dados para retornar ao componente pai
    const altaData = {
      exames: exames,
      prescricoes: prescricoes,
      pacienteId: paciente.id,
      dataAlta: new Date().toLocaleString()
    };

    // Enviar os dados para o componente pai, mas não finalizar a consulta ainda
    // O segundo parâmetro (true) indica que os dados foram preenchidos
    // O terceiro parâmetro são os dados da alta (exames e prescrições)
    onCancel(true, altaData);

    message.success({
      content: 'Dados de alta salvos. Retornando para a consulta médica.',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
    });
  };

  // Colunas das tabelas
  const exameColumns = [
    {
      title: 'Exame',
      dataIndex: 'nome',
      key: 'nome',
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
        } else if (estado === 'Aguardando') {
          color = 'warning';
        }
        return (
          <Tag color={color}>{estado}</Tag>
        );
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
          onClick={() => handleExameDelete(record.id)}
        />
      ),
    },
  ];

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
        if (text === 'oral') color = 'green';
        if (text === 'intravenosa') color = 'red';
        if (text === 'intramuscular') color = 'orange';
        if (text === 'subcutânea') color = 'purple';
        if (text === 'tópica') color = 'cyan';

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
          onClick={() => handlePrescricaoDelete(record.id)}
        />
      ),
    },
  ];
  // Modal de Cadastro de Exame
  const ExameModal = () => {
    const [enviarParaLaboratorio, setEnviarParaLaboratorio] = useState(true);
    // Lista predefinida de exames comuns
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

    const addCustomExame = () => {
      if (customExameName.trim() !== '') {
        const newOption = { value: customExameName, label: customExameName };
        setExamOptions([...examOptions, newOption]);
        setCustomExameName('');
      }
    };

    const handleExameFormFinish = (values) => {
      adicionarMultiplosExames({ ...values, enviarParaLaboratorio });
    };

    return (<Modal
      title="Adicionar Exames"
      open={exameModalVisible}
      onCancel={() => setExameModalVisible(false)}
      footer={null}
      width={700}
    >
      <Form
        form={exameForm}
        layout="vertical"
        name="exameForm"
        onFinish={handleExameFormFinish}
        initialValues={{
          prioridade: 'Normal',
          enviarParaLaboratorio: true
        }}
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
            maxTagCount={5} dropdownRender={(menu) => (
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
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                    Você pode pesquisar, selecionar múltiplos exames, ou adicionar novos exames personalizados.
                  </div>
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item
          name="dataColeta"
          label="Data de Coleta"
          rules={[{ required: true, message: 'Por favor, selecione a data de coleta' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="prioridade"
          label="Prioridade"
          initialValue="Normal"
          rules={[{ required: true, message: 'Por favor, selecione a prioridade' }]}
        >
          <Select
            placeholder="Selecione a prioridade"
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                  <div style={{ marginBottom: '4px', fontSize: '12px', color: '#888' }}>
                    A prioridade será usada pelo laboratório para organizar os exames
                  </div>
                </div>
              </>
            )}
          >
            <Option value="Urgente">
              <Tag color="red">Urgente</Tag>
            </Option>
            <Option value="Normal">
              <Tag color="blue">Normal</Tag>
            </Option>
            <Option value="Baixa">
              <Tag color="green">Baixa</Tag>
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="observacoes"
          label="Observações"
        >
          <TextArea rows={4} />
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
              Os exames serão enviados para a aba "Solicitações de Exames" para aprovação e posterior processamento no laboratório
            </div>
          )}
        </Form.Item>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: '20px' }}>
          <Button
            onClick={() => setExameModalVisible(false)}
            style={{ marginRight: '10px' }}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
          >
            Adicionar Exames
          </Button>
        </Form.Item>
      </Form>
    </Modal>
    );
  };
  // Modal de Cadastro de Prescrição
  const PrescricaoModal = () => {
    const [prescricoesTemp, setPrescricoesTemp] = useState([]);
    const [doseDiaria, setDoseDiaria] = useState(1);

    const handleDoseDiariaChange = (value) => {
      setDoseDiaria(value || 1);
    };

    const handleAddPrescricaoTemp = () => {
      prescricaoForm.validateFields().then(values => {
        // Coleta os horários conforme a quantidade de doses
        const horarios = [];
        for (let i = 1; i <= doseDiaria; i++) {
          if (values[`hora${i}`]) {
            horarios.push(values[`hora${i}`].format('HH:mm'));
          }
        }

        const horarioFormatado = horarios.length > 0
          ? `Horários: ${horarios.join(', ')}`
          : '';

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
          dosagem: `${values.quantidade} ${values.unidade} - ${values.doseDiaria}x ao dia${horarioFormatado ? ` (${horarioFormatado})` : ''}`
        };

        setPrescricoesTemp([...prescricoesTemp, novaPrescricao]);
        message.success('Prescrição adicionada à lista temporária');
      }).catch(errorInfo => {
      });
    };

    const handleConfirmPrescricoes = () => {
      setPrescricoes([...prescricoes, ...prescricoesTemp]);
      setPrescricoesTemp([]);
      prescricaoForm.resetFields();
      setPrescricaoModalVisible(false);
      message.success('Prescrições confirmadas com sucesso');
    }; return (<Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg viewBox="64 64 896 896" focusable="false" data-icon="medicine-box" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '24px', marginRight: '12px' }}>
            <path d="M839.2 278.1a32 32 0 00-30.4-22.1H736V144c0-17.7-14.3-32-32-32H320c-17.7 0-32 14.3-32 32v112h-72.8a31.9 31.9 0 00-30.4 22.1L112 502v378c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V502l-72.8-223.9zM360 184h304v72H360v-72zm480 656H184V513.4L244.3 328h535.4L840 513.4V840zM652 572H544V464c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v108H372c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h108v108c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V636h108c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Nova Prescrição Médica</span>
        </div>
      }
      open={prescricaoModalVisible}
      onCancel={() => {
        setPrescricaoModalVisible(false);
        setPrescricoesTemp([]);
      }}
      width={700}
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
          onClick={handleConfirmPrescricoes}
          disabled={prescricoesTemp.length === 0}
          icon={<CheckCircleOutlined />}
        >
          Confirmar Prescrições
        </Button>,
      ]}
    >
      <Form
        form={prescricaoForm}
        layout="vertical"
        name="prescricaoForm"
      >          <div style={{ marginBottom: 24 }}>
          <div style={{
            padding: '16px',
            background: '#f0f8ff',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #d6e4ff'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1890ff', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="64 64 896 896" focusable="false" data-icon="user" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}>
                <path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path>
              </svg>
              Informações do Paciente
            </div>
            <div className="prescription-form-row">
              <Form.Item
                name="nid"
                label="NID"
                className="prescription-form-item"
                initialValue={paciente?.nid || 'N/A'}
              >
                <Input disabled />
              </Form.Item>
              <Form.Item
                name="nomeUtente"
                label="Nome do Utente"
                className="prescription-form-item"
                initialValue={paciente?.nome || 'N/A'}
              >
                <Input disabled />
              </Form.Item>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>              <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{
            padding: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1890ff', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="64 64 896 896" focusable="false" data-icon="medicine-box" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}>
                <path d="M839.2 278.1a32 32 0 00-30.4-22.1H736V144c0-17.7-14.3-32-32-32H320c-17.7 0-32 14.3-32 32v112h-72.8a31.9 31.9 0 00-30.4 22.1L112 502v378c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V502l-72.8-223.9zM360 184h304v72H360v-72zm480 656H184V513.4L244.3 328h535.4L840 513.4V840zM652 572H544V464c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v108H372c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h108v108c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V636h108c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
              </svg>
              Medicamento
            </div>
            <Form.Item
              name="medicamento"
              rules={[{ required: true, message: 'Por favor, selecione o medicamento' }]}
            >
              <Select
                placeholder="Selecione o medicamento"
                showSearch
                optionFilterProp="children"
                style={{ width: '100%' }}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              >
                <Option value="Paracetamol">Paracetamol</Option>
                <Option value="Ibuprofeno">Ibuprofeno</Option>
                <Option value="Amoxicilina">Amoxicilina</Option>
                <Option value="Dipirona">Dipirona</Option>
                <Option value="Metformina">Metformina</Option>
                <Option value="Losartana">Losartana</Option>
                <Option value="Omeprazol">Omeprazol</Option>
                <Option value="Atenolol">Atenolol</Option>
                <Option value="Sinvastatina">Sinvastatina</Option>
                <Option value="Ácido Acetilsalicílico">Ácido Acetilsalicílico</Option>
              </Select>
            </Form.Item>
          </div><div style={{
            padding: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1890ff', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="64 64 896 896" focusable="false" data-icon="medicine-box" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}>
                <path d="M839.2 278.1a32 32 0 00-30.4-22.1H736V144c0-17.7-14.3-32-32-32H320c-17.7 0-32 14.3-32 32v112h-72.8a31.9 31.9 0 00-30.4 22.1L112 502v378c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V502l-72.8-223.9zM360 184h304v72H360v-72zm480 656H184V513.4L244.3 328h535.4L840 513.4V840zM652 572H544V464c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v108H372c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h108v108c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V636h108c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
              </svg>
              Informações da Dose
            </div>

            <div className="prescription-form-row">
              <Form.Item
                name="quantidade"
                label="Quantidade"
                rules={[{ required: true, message: 'Obrigatório' }]}
                className="prescription-form-item"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="unidade"
                label="Unidade"
                rules={[{ required: true, message: 'Obrigatório' }]}
                className="prescription-form-item"
              >
                <Select placeholder="Unidade">
                  <Option value="mg">mg</Option>
                  <Option value="ml">ml</Option>
                  <Option value="comprimido">comprimido</Option>
                  <Option value="cápsula">cápsula</Option>
                  <Option value="gota">gota</Option>
                  <Option value="ampola">ampola</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="viaAdministracao"
                label="Via de Administração"
                rules={[{ required: true, message: 'Obrigatório' }]}
                className="prescription-form-item"
              >
                <Select placeholder="Via">
                  <Option value="oral">Oral</Option>
                  <Option value="intravenosa">Intravenosa</Option>
                  <Option value="intramuscular">Intramuscular</Option>
                  <Option value="subcutânea">Subcutânea</Option>
                  <Option value="tópica">Tópica</Option>
                  <Option value="inalatória">Inalatória</Option>
                  <Option value="sublingual">Sublingual</Option>
                </Select>
              </Form.Item>
            </div>

            <div className="prescription-form-row" style={{ marginTop: '16px' }}>
              <Form.Item
                name="doseDiaria"
                label="Dose Diária (vezes ao dia)"
                rules={[{ required: true, message: 'Obrigatório' }]}
                className="prescription-form-item"
              >
                <InputNumber
                  min={1}
                  max={6}
                  style={{ width: '100%' }}
                  onChange={handleDoseDiariaChange}
                />
              </Form.Item>

              <Form.Item
                name="numeroDias"
                label="Duração do Tratamento (dias)"
                rules={[{ required: true, message: 'Obrigatório' }]}
                className="prescription-form-item"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>                <div style={{
            padding: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1890ff', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="64 64 896 896" focusable="false" data-icon="clock-circle" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}>
                <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
                <path d="M686.7 638.6L544.1 535.5V288c0-4.4-3.6-8-8-8H488c-4.4 0-8 3.6-8 8v275.4c0 2.6 1.2 5 3.3 6.5l165.4 120.6c3.6 2.6 8.6 1.8 11.2-1.7l28.6-39c2.6-3.7 1.8-8.7-1.8-11.2z"></path>
              </svg>
              Horários de Administração
            </div>
            <div className="prescription-form-row">
              {Array.from({ length: doseDiaria }, (_, i) => (
                <Form.Item
                  key={i}
                  name={`hora${i + 1}`}
                  label={`${i + 1}ª Dose`}
                  className="prescription-form-item"
                >
                  <TimePicker
                    format="HH:mm"
                    style={{ width: '100%' }}
                    placeholder="Selecione o horário"
                  />
                </Form.Item>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              Defina os horários para cada dose diária. Isso ajudará o paciente a seguir corretamente o tratamento.
            </div>
          </div>                <div style={{
            padding: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1890ff', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="64 64 896 896" focusable="false" data-icon="file-text" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}>
                <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM312 490v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H320c-4.4 0-8 3.6-8 8z"></path>
              </svg>
              Instruções Adicionais
            </div>
            <Form.Item
              name="comentario"
              style={{ marginBottom: 0 }}
            >
              <TextArea
                rows={3}
                placeholder="Ex: Tomar após as refeições, evitar bebidas alcoólicas, etc."
              />
            </Form.Item>
          </div>

          <Button
            type="primary"
            block
            icon={<PlusOutlined />}
            onClick={handleAddPrescricaoTemp}
            style={{ height: '40px' }}
          >
            Adicionar à lista
          </Button>
        </Space>
        </div>          {prescricoesTemp.length > 0 && (
          <div style={{
            marginTop: 24,
            background: '#f0f8ff',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #d6e4ff'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1890ff',
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg viewBox="64 64 896 896" focusable="false" data-icon="unordered-list" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ marginRight: '8px', fontSize: '18px' }}>
                  <path d="M912 192H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM104 228a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0z"></path>
                </svg>
                Prescrições a serem adicionadas
              </div>
              <Tag color="blue">
                {prescricoesTemp.length} item(ns)
              </Tag>
            </div>
            <Table
              dataSource={prescricoesTemp}
              columns={prescricaoColumns}
              size="small"
              pagination={false}
              rowKey="id"
              bordered
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            />
          </div>)}
      </Form>
    </Modal>
    );
  };

  return (
    <>      <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px', marginRight: 8 }} />
          <span>Alta do Paciente</span>          </div>
      }
      open={open} onCancel={() => onCancel(false)}
      width={800}
      footer={[
        <Button key="back" onClick={() => onCancel(false)}>
          Cancelar
        </Button>,
        <Button key="submit" type="primary" onClick={handleFinish} icon={<CheckCircleOutlined />}>
          Salvar e Voltar à Consulta
        </Button>,
      ]}
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane
          tab={
            <span>
              <MedicineBoxOutlined />
              Exames
            </span>
          }
          key="1"
        >
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setExameModalVisible(true)}
            >
              Adicionar Exame
            </Button>
          </div>
          <Table
            dataSource={exames}
            columns={exameColumns}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'Nenhum exame cadastrado' }}
          />
        </TabPane>          <TabPane
          tab={
            <span>
              <MedicineBoxOutlined />
              Prescrições
            </span>
          }
          key="2"
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {prescricoes.length > 0 && (
                <div style={{ fontSize: '14px' }}>
                  <Tag color="blue" style={{ marginRight: '8px' }}>
                    {prescricoes.length} prescrição(ões)
                  </Tag>
                  Total de {prescricoes.reduce((total, p) => total + (p.numeroDias || 0), 0)} dias de tratamento
                </div>
              )}
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setPrescricaoModalVisible(true)}
            >
              Adicionar Prescrição
            </Button>
          </div>
          <Table
            dataSource={prescricoes}
            columns={prescricaoColumns}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'Nenhuma prescrição cadastrada' }}
            bordered
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        </TabPane>
      </Tabs>
    </Modal>

      {/* Modais secundários */}
      {exameModalVisible && <ExameModal />}
      {prescricaoModalVisible && <PrescricaoModal />}
    </>
  );
};

export default AltaModal;
