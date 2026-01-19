
import React, { useState } from 'react';
import { Card, Row, Col, Typography, Tabs, Table, Button, Tag, Select, Modal, Form, Input, InputNumber, Radio } from 'antd';
import { UserOutlined, FileTextOutlined, MedicineBoxOutlined, AppstoreAddOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { TabPane } = Tabs;


// Dados mock para especialidades
const especialidadesMock = [
  { id: 1, nome: 'Cardiologia', descricao: 'Doenças do coração' },
  { id: 2, nome: 'Pediatria', descricao: 'Saúde infantil' },
];

// Dados mock para tratamentos
const tratamentosMock = [
  { id: 1, nome: 'Consulta', descricao: 'Consulta médica geral' },
  { id: 2, nome: 'Vacinação', descricao: 'Aplicação de vacinas' },
];

// Dados mock para tipos de utente
const tiposUtenteMock = [
  { id: 1, nome: 'Estudante', descricao: 'Aluno da instituição' },
  { id: 2, nome: 'Funcionário', descricao: 'Funcionário da instituição' },
  { id: 3, nome: 'Docente', descricao: 'Professor da instituição' },
];

// Dados mock para tipos de consulta
const tiposConsultaMock = [
  { id: 1, nome: 'Primeira Consulta', descricao: 'Primeira vez do paciente' },
  { id: 2, nome: 'Reconsulta', descricao: 'Retorno do paciente' },
];

// Dados mock para tipos de exame
const tiposExameMock = [
  { id: 1, nome: 'Raio-X', descricao: 'Exame de imagem' },
  { id: 2, nome: 'Hemograma', descricao: 'Exame de sangue' },
];

// Dados mock para exames
const examesMock = [
  { id: 1, tipoExame: 1, tipoUtente: 1, valor: 1200, estado: 'Ativo' },
  { id: 2, tipoExame: 2, tipoUtente: 2, valor: 600, estado: 'Inativo' },
];

// Dados mock para consultas
const consultasMock = [
  { id: 1, tipoConsulta: 1, tipoUtente: 1, valor: 800, estado: 'Ativo' },
  { id: 2, tipoConsulta: 2, tipoUtente: 2, valor: 400, estado: 'Inativo' },
];

// Dados mock para províncias
const provinciasMock = [
  { id: 1, nome: 'Maputo', descricao: 'Capital de Moçambique' },
  { id: 2, nome: 'Nampula', descricao: 'Província do norte de Moçambique' },
  { id: 3, nome: 'Sofala', descricao: 'Província central de Moçambique' },
];

// Dados mock para bairros
const bairrosMock = [
  { id: 1, nome: 'Alto Maé', provincia: 1, descricao: 'Bairro em Maputo' },
  { id: 2, nome: 'Sommerschield', provincia: 1, descricao: 'Bairro nobre de Maputo' },
  { id: 3, nome: 'Nacala', provincia: 2, descricao: 'Bairro em Nampula' },
  { id: 4, nome: 'Beira Central', provincia: 3, descricao: 'Bairro na Beira, Sofala' },
];

// Dados mock para unidades orgânicas
const unidadesOrganicasMock = [
  { id: 1, nome: 'Departamento de Pediatria', descricao: 'Unidade responsável pelos cuidados infantis' },
  { id: 2, nome: 'Departamento de Cardiologia', descricao: 'Unidade especializada em doenças cardíacas' },
];

// Dados mock para serviços
const servicosMock = [
  { id: 1, especialidade: 1, tratamento: 1, tipoUtente: 1, valor: 1000, estado: 'Ativo' },
  { id: 2, especialidade: 2, tratamento: 2, tipoUtente: 2, valor: 500, estado: 'Inativo' },
];

const Parametrizacao = () => {
  const [view, setView] = useState('cards');
  const [especialidades, setEspecialidades] = useState(especialidadesMock);
  const [tratamentos, setTratamentos] = useState(tratamentosMock);
  const [servicos, setServicos] = useState(servicosMock);
  const [tiposUtente, setTiposUtente] = useState(tiposUtenteMock);
  const [tiposConsulta, setTiposConsulta] = useState(tiposConsultaMock);
  const [consultas, setConsultas] = useState(consultasMock);
  const [tiposExame, setTiposExame] = useState(tiposExameMock);
  const [exames, setExames] = useState(examesMock);
  const [provincias, setProvincias] = useState(provinciasMock);
  const [bairros, setBairros] = useState(bairrosMock);
  const [unidadesOrganicas, setUnidadesOrganicas] = useState(unidadesOrganicasMock);
  const [activeTab, setActiveTab] = useState('1');
  const [searchText, setSearchText] = useState('');

  // Tabela de Tipos de Exame
  const tiposExameColumns = [
    {
      title: 'Nome do Tipo de Exame',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoExame', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Províncias
  const provinciasColumns = [
    {
      title: 'Nome da Província',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('provincia', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Bairros
  const bairrosColumns = [
    {
      title: 'Nome do Bairro',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Província',
      dataIndex: 'provincia',
      key: 'provincia',
      render: (id) => {
        const prov = provincias.find(p => p.id === id);
        return prov ? prov.nome : '-';
      }
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('bairro', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Exames
  const examesColumns = [
    {
      title: 'Nome do Tipo de Exame',
      dataIndex: 'tipoExame',
      key: 'tipoExame',
      render: (id) => {
        const te = tiposExame.find(t => t.id === id);
        return te ? te.nome : '-';
      }
    },
    {
      title: 'Tipo de Utente',
      dataIndex: 'tipoUtente',
      key: 'tipoUtente',
      render: (id) => {
        const tu = tiposUtente.find(t => t.id === id);
        return tu ? tu.nome : '-';
      }
    },
    {
      title: 'Valor a Pagar',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => valor + ' MZN',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'Ativo' ? 'green' : 'red'}>{estado}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('exame', record)}>Editar</Button>
      )
    }
  ];
  // Tabela de Tipos de Consulta
  const tiposConsultaColumns = [
    {
      title: 'Nome do Tipo de Consulta',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoConsulta', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Consultas
  const consultasColumns = [
    {
      title: 'Tipo de Consulta',
      dataIndex: 'tipoConsulta',
      key: 'tipoConsulta',
      render: (id) => {
        const tc = tiposConsulta.find(t => t.id === id);
        return tc ? tc.nome : '-';
      }
    },
    {
      title: 'Tipo de Utente',
      dataIndex: 'tipoUtente',
      key: 'tipoUtente',
      render: (id) => {
        const tu = tiposUtente.find(t => t.id === id);
        return tu ? tu.nome : '-';
      }
    },
    {
      title: 'Valor a Pagar',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => valor + ' MZN',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'Ativo' ? 'green' : 'red'}>{estado}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('consulta', record)}>Editar</Button>
      )
    }
  ];
  // Tabela de Tipos de Utente
  const tiposUtenteColumns = [
    {
      title: 'Nome do Tipo de Utente',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoUtente', record)}>Editar</Button>
      )
    }
  ];
  const [modalVisible, setModalVisible] = useState(false);
  const [tabKey, setTabKey] = useState('servicos');
  const [tratamentoTabKey, setTratamentoTabKey] = useState('tratamentos');
  const [form] = Form.useForm();

  // Para adicionar/editar especialidade ou serviço
  const [editType, setEditType] = useState(null); // 'especialidade' ou 'servico'
  const [editRecord, setEditRecord] = useState(null);

  // Tabela de Serviços
  const servicosColumns = [
    {
      title: 'Especialidade',
      dataIndex: 'especialidade',
      key: 'especialidade',
      render: (id) => {
        const esp = especialidades.find(e => e.id === id);
        return esp ? esp.nome : '-';
      }
    },
    {
      title: 'Tratamento',
      dataIndex: 'tratamento',
      key: 'tratamento',
      render: (id) => {
        const t = tratamentos.find(tr => tr.id === id);
        return t ? t.nome : '-';
      }
    },
    {
      title: 'Tipo de Utente',
      dataIndex: 'tipoUtente',
      key: 'tipoUtente',
      render: (id) => {
        const tu = tiposUtente.find(t => t.id === id);
        return tu ? tu.nome : '-';
      }
    },
    {
      title: 'Valor a Pagar',
      dataIndex: 'valor',
      key: 'valor',
      render: v => `MZN ${v}`
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: estado => (
        <Tag color={estado === 'Ativo' ? 'green' : 'red'}>{estado}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('servico', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Tratamentos
  const tratamentosColumns = [
    {
      title: 'Nome do Tratamento',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tratamento', record)}>Editar</Button>
      )
    }
  ];
  
  // Tabela de Unidades Orgânicas
  const unidadesOrganicasColumns = [
    {
      title: 'Nome da Unidade Orgânica',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('unidadeOrganica', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Especialidades
  const especialidadesColumns = [
    {
      title: 'Nome da Especialidade',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('especialidade', record)}>Editar</Button>
      )
    }
  ];


  function handleEdit(type, record) {
    setEditType(type);
    setEditRecord(record);
    setModalVisible(true);
    if (type === 'especialidade') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'servico') {
      form.setFieldsValue({ especialidade: record.especialidade, tratamento: record.tratamento, tipoUtente: record.tipoUtente, valor: record.valor, estado: record.estado });
    } else if (type === 'tratamento') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'unidadeOrganica') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'provincia') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'bairro') {
      form.setFieldsValue({ nome: record.nome, provincia: record.provincia, descricao: record.descricao });
    } else if (type === 'tipoUtente') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'tipoConsulta') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'consulta') {
      form.setFieldsValue({ tipoConsulta: record.tipoConsulta, tipoUtente: record.tipoUtente, valor: record.valor, estado: record.estado });
    } else if (type === 'tipoExame') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'exame') {
      form.setFieldsValue({ tipoExame: record.tipoExame, tipoUtente: record.tipoUtente, valor: record.valor, estado: record.estado });
    } else if (type === 'provincia') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'bairro') {
      form.setFieldsValue({ nome: record.nome, provincia: record.provincia, descricao: record.descricao });
    }
  }

  function handleAdd(type) {
      setEditType(type);
      setEditRecord(null);
      setModalVisible(true);
      form.resetFields();
    }
  
    const handleSearchInput = (e) => {
      setSearchText(e.target.value);
      // Here you can add implementation for searching through data
    };


  function handleModalOk() {
    form.validateFields().then(values => {
      if (editType === 'especialidade') {
        if (editRecord) {
          setEspecialidades(especialidades.map(e => e.id === editRecord.id ? { ...e, ...values } : e));
        } else {
          setEspecialidades([...especialidades, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'servico') {
        if (editRecord) {
          setServicos(servicos.map(s => s.id === editRecord.id ? { ...s, ...values } : s));
        } else {
          setServicos([...servicos, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'tratamento') {
        if (editRecord) {
          setTratamentos(tratamentos.map(t => t.id === editRecord.id ? { ...t, ...values } : t));
        } else {
          setTratamentos([...tratamentos, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'tipoUtente') {
        if (editRecord) {
          setTiposUtente(tiposUtente.map(t => t.id === editRecord.id ? { ...t, ...values } : t));
        } else {
          setTiposUtente([...tiposUtente, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'tipoConsulta') {
        if (editRecord) {
          setTiposConsulta(tiposConsulta.map(t => t.id === editRecord.id ? { ...t, ...values } : t));
        } else {
          setTiposConsulta([...tiposConsulta, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'consulta') {
        if (editRecord) {
          setConsultas(consultas.map(c => c.id === editRecord.id ? { ...c, ...values } : c));
        } else {
          setConsultas([...consultas, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'tipoExame') {
        if (editRecord) {
          setTiposExame(tiposExame.map(t => t.id === editRecord.id ? { ...t, ...values } : t));
        } else {
          setTiposExame([...tiposExame, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'exame') {
        if (editRecord) {
          setExames(exames.map(e => e.id === editRecord.id ? { ...e, ...values } : e));
        } else {
          setExames([...exames, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'provincia') {
        if (editRecord) {
          setProvincias(provincias.map(p => p.id === editRecord.id ? { ...p, ...values } : p));
        } else {
          setProvincias([...provincias, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'bairro') {
        if (editRecord) {
          setBairros(bairros.map(b => b.id === editRecord.id ? { ...b, ...values } : b));
        } else {
          setBairros([...bairros, { id: Date.now(), ...values }]);
        }
      } else if (editType === 'unidadeOrganica') {
        if (editRecord) {
          setUnidadesOrganicas(unidadesOrganicas.map(u => u.id === editRecord.id ? { ...u, ...values } : u));
        } else {
          setUnidadesOrganicas([...unidadesOrganicas, { id: Date.now(), ...values }]);
        }
      }
      setModalVisible(false);
    });
  }


  // Cards principais
  if (view === 'cards') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <Title level={3} style={{ color: '#28a745', marginBottom: 32 }}>Parametrização</Title>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('especialidade')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Especialidades</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie especialidades e serviços</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('tratamento')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <MedicineBoxOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Tratamentos</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os tipos de tratamentos.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('tipoUtente')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <UserOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Utentes</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os tipos de utente.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('consulta')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Consulta</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie consultas e tipos de consulta.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('exame')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <MedicineBoxOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Exames</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os tipos de exames.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('territorio')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Território</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie províncias e bairros.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('unidadeOrganica')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Unidade Orgânica</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie as unidades orgânicas.</div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // View de Exames
  if (view === 'exame') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
        style={{
          boxShadow: '0 2px 8px #f0f1f2',
          borderRadius: 8,
          background: '#fff',
          margin: '0 auto'
        }}
          >
        {/* Header com Ícone */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MedicineBoxOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
            <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
          Exames
            </h2>
          </div>

          <Button
            onClick={() => setView('cards')}
            style={{
          color: '#3b82f6',
          fontWeight: 'bold',
          borderRadius: '8px',
          padding: '6px 16px',
            }}
          >
            Voltar
          </Button>
        </div>

        {/* Área de Tabs e Pesquisa */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          style={{ marginBottom: 0 }}
          items={[
            {
              key: '1',
              label: 'Exames'
            },
            {
              key: '2',
              label: 'Tipos de Exames'
            }
          ]}
            />
          </div>
          <div>
            <Input
          prefix={<SearchOutlined />}
          placeholder="Pesquisar..."
          value={searchText}
          onChange={handleSearchInput}
          allowClear
          style={{
            width: 320,
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            padding: '8px 12px',
          }}
            />
          </div>
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === '1' ? (
          <>
            <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAdd('exame')}
          style={{
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '8px',
            padding: '6px 16px',
            marginBottom: 16
          }}
            >
          Novo Exame
            </Button>
            <Table
          columns={examesColumns}
          dataSource={exames}
          rowKey="id"
          pagination={{
            pageSize: 3,
            showSizeChanger: false,
            style: { marginTop: 5 },
          }}
          bordered
          style={{ borderRadius: 10, overflow: 'hidden' }}
          rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />
          </>
        ) : activeTab === '2' ? (
          <>
            <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAdd('tipoExame')}
          style={{
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '8px',
            padding: '6px 16px',
            marginBottom: 16
          }}
            >
          Novo Tipo de Exame
            </Button>
            <Table
          columns={tiposExameColumns}
          dataSource={tiposExame}
          rowKey="id"
          pagination={{
            pageSize: 3,
            showSizeChanger: false,
            style: { marginTop: 5 },
          }}
          bordered
          style={{ borderRadius: 10, overflow: 'hidden' }}
          rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />
          </>
        ) : null}

        <Modal
          open={modalVisible}
          title={editType === 'tipoExame' ? (editRecord ? 'Editar Tipo de Exame' : 'Novo Tipo de Exame') : (editType === 'exame' ? (editRecord ? 'Editar Exame' : 'Novo Exame') : '')}
          onCancel={() => setModalVisible(false)}
          onOk={handleModalOk}
          okText="Salvar"
          destroyOnClose
        >
          <Form form={form} layout="vertical">
            {editType === 'tipoExame' ? (
          <>
            <Form.Item name="nome" label="Nome do Tipo de Exame" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Input placeholder="Digite o nome do tipo de exame" />
            </Form.Item>
            <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Input.TextArea placeholder="Digite a descrição do tipo de exame" rows={3} />
            </Form.Item>
          </>
            ) : editType === 'exame' ? (
          <>
            <Form.Item name="tipoExame" label="Tipo de Exame" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Select placeholder="Selecione o tipo de exame">
            {tiposExame.map(te => (
              <Select.Option key={te.id} value={te.id}>{te.nome}</Select.Option>
            ))}
              </Select>
            </Form.Item>
            <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Select placeholder="Selecione o tipo de utente">
            {tiposUtente.map(tu => (
              <Select.Option key={tu.id} value={tu.id}>{tu.nome}</Select.Option>
            ))}
              </Select>
            </Form.Item>
            <Form.Item name="valor" label="Valor a Pagar" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="MZN" />
            </Form.Item>
            <Form.Item name="estado" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Select>
            <Select.Option value="Ativo">Ativo</Select.Option>
            <Select.Option value="Inativo">Inativo</Select.Option>
              </Select>
            </Form.Item>
          </>
            ) : null}
          </Form>
        </Modal>

        {/* Estilos personalizados */}
        <style>{`
          .ant-table-thead > tr > th {
            background: #e8eefc !important;
            color: #2d3a4a !important;
            font-weight: 600;
            font-size: 15px;
          }
          .ant-table-row-light {
            background: #ffffff;
          }
          .ant-table-row-dark {
            background: #f6f8fa;
          }
          .ant-table-tbody > tr:hover > td {
            background: #e0f2fe !important;
          }
          .ant-btn-primary {
            background: #3b82f6 !important;
            border-color: #3b82f6 !important;
          }
        `}</style>
          </Card>
        </div>
      </div>
        );
  }

  // View de Consulta
  if (view === 'consulta') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
            style={{
              boxShadow: '0 2px 8px #f0f1f2',
              borderRadius: 8,
              background: '#fff',
              margin: '0 auto'
            }}
          >
            {/* Header com Ícone */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileTextOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Consultas
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Tabs e Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Consultas'
                    },
                    {
                      key: '2',
                      label: 'Tipos de Consultas'
                    }
                  ]}
                />
              </div>
              <div>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Pesquisar..."
                  value={searchText}
                  onChange={handleSearchInput}
                  allowClear
                  style={{
                    width: 320,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Conteúdo das Tabs */}
            {activeTab === '1' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('consulta')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Nova Consulta
                </Button>
                <Table
                  columns={consultasColumns}
                  dataSource={consultas}
                  rowKey="id"
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : activeTab === '2' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('tipoConsulta')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Novo Tipo de Consulta
                </Button>
                <Table
                  columns={tiposConsultaColumns}
                  dataSource={tiposConsulta}
                  rowKey="id"
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : null}

            <Modal
              open={modalVisible}
              title={editType === 'tipoConsulta' ? (editRecord ? 'Editar Tipo de Consulta' : 'Novo Tipo de Consulta') : (editType === 'consulta' ? (editRecord ? 'Editar Consulta' : 'Nova Consulta') : '')}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'tipoConsulta' ? (
                  <>
                    <Form.Item name="nome" label="Nome do Tipo de Consulta" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome do tipo de consulta" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input.TextArea placeholder="Digite a descrição do tipo de consulta" rows={3} />
                    </Form.Item>
                  </>
                ) : editType === 'consulta' ? (
                  <>
                    <Form.Item name="tipoConsulta" label="Tipo de Consulta" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tipo de consulta">
                        {tiposConsulta.map(tc => (
                          <Select.Option key={tc.id} value={tc.id}>{tc.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tipo de utente">
                        {tiposUtente.map(tu => (
                          <Select.Option key={tu.id} value={tu.id}>{tu.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="valor" label="Valor a Pagar" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <InputNumber min={0} style={{ width: '100%' }} addonAfter="MZN" />
                    </Form.Item>
                    <Form.Item name="estado" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select>
                        <Select.Option value="Ativo">Ativo</Select.Option>
                        <Select.Option value="Inativo">Inativo</Select.Option>
                      </Select>
                    </Form.Item>
                  </>
                ) : null}
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
              .ant-table-thead > tr > th {
                background: #e8eefc !important;
                color: #2d3a4a !important;
                font-weight: 600;
                font-size: 15px;
              }
              .ant-table-row-light {
                background: #ffffff;
              }
              .ant-table-row-dark {
                background: #f6f8fa;
              }
              .ant-table-tbody > tr:hover > td {
                background: #e0f2fe !important;
              }
              .ant-btn-primary {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
              }
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Tipos de Utente
  if (view === 'tipoUtente') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
            style={{
              boxShadow: '0 2px 8px #f0f1f2',
              borderRadius: 8,
              background: '#fff',
              margin: '0 auto'
            }}
          >
            {/* Header com Ícone */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Tipos de Utente
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Tabs e Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <Tabs
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Tipos de Utente'
                    }
                  ]}
                />
              </div>
              <div>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Pesquisar..."
                  value={searchText}
                  onChange={handleSearchInput}
                  allowClear
                  style={{
                    width: 320,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Conteúdo */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('tipoUtente')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Tipo de Utente
            </Button>
            <Table
              columns={tiposUtenteColumns}
              dataSource={tiposUtente}
              rowKey="id"
              pagination={{
                pageSize: 3,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editType === 'tipoUtente' ? (editRecord ? 'Editar Tipo de Utente' : 'Novo Tipo de Utente') : ''}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do tipo de utente" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição do tipo de utente" rows={3} />
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
              .ant-table-thead > tr > th {
                background: #e8eefc !important;
                color: #2d3a4a !important;
                font-weight: 600;
                font-size: 15px;
              }
              .ant-table-row-light {
                background: #ffffff;
              }
              .ant-table-row-dark {
                background: #f6f8fa;
              }
              .ant-table-tbody > tr:hover > td {
                background: #e0f2fe !important;
              }
              .ant-btn-primary {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
              }
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Território
  if (view === 'territorio') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
            style={{
              boxShadow: '0 2px 8px #f0f1f2',
              borderRadius: 8,
              background: '#fff',
              margin: '0 auto'
            }}
          >
            {/* Header com Ícone */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AppstoreAddOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Território
                </h2>
              </div>
              <Button
                onClick={() => setView('cards')}
                icon={<PlusOutlined style={{ transform: 'rotate(45deg)' }} />}
                style={{
                  background: '#e0f2fe',
                  color: '#3b82f6',
                  borderColor: 'transparent',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Tabs e Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Províncias'
                    },
                    {
                      key: '2',
                      label: 'Bairros'
                    }
                  ]}
                />
              </div>
              <div>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Pesquisar..."
                  value={searchText}
                  onChange={handleSearchInput}
                  allowClear
                  style={{
                    width: 320,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Conteúdo das Tabs */}
            <div style={{ padding: '16px 0' }}>
              {activeTab === '1' && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleAdd('provincia')}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      marginBottom: 16
                    }}
                  >
                    Nova Província
                  </Button>
                  <Table
                    columns={provinciasColumns}
                    dataSource={provincias}
                    rowKey="id"
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      style: { marginTop: 5 },
                    }}
                    bordered
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                  />
                </>
              )}
              {activeTab === '2' && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleAdd('bairro')}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      marginBottom: 16
                    }}
                  >
                    Novo Bairro
                  </Button>
                  <Table
                    columns={bairrosColumns}
                    dataSource={bairros}
                    rowKey="id"
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      style: { marginTop: 5 },
                    }}
                    bordered
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                  />
                </>
              )}
            </div>

            <Modal
              open={modalVisible}
              title={
                editType === 'provincia' 
                  ? (editRecord ? 'Editar Província' : 'Nova Província') 
                  : editType === 'bairro' 
                  ? (editRecord ? 'Editar Bairro' : 'Novo Bairro') 
                  : ''
              }
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'provincia' ? (
                  <>
                    <Form.Item name="nome" label="Nome da Província" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome da província" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input.TextArea placeholder="Digite a descrição da província" rows={3} />
                    </Form.Item>
                  </>
                ) : editType === 'bairro' ? (
                  <>
                    <Form.Item name="nome" label="Nome do Bairro" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome do bairro" />
                    </Form.Item>
                    <Form.Item name="provincia" label="Província" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione a província">
                        {provincias.map(p => (
                          <Select.Option key={p.id} value={p.id}>{p.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input.TextArea placeholder="Digite a descrição do bairro" rows={3} />
                    </Form.Item>
                  </>
                ) : null}
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
              .ant-table-thead > tr > th {
                background: #e8eefc !important;
                color: #2d3a4a !important;
                font-weight: 600;
                font-size: 15px;
              }
              .ant-table-row-light {
                background: #ffffff;
              }
              .ant-table-row-dark {
                background: #f6f8fa;
              }
              .ant-table-tbody > tr:hover > td {
                background: #e0f2fe !important;
              }
              .ant-btn-primary {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
              }
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Tratamentos
  if (view === 'tratamento') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
            style={{
              boxShadow: '0 2px 8px #f0f1f2',
              borderRadius: 8,
              background: '#fff',
              margin: '0 auto'
            }}
          >
            {/* Header com Ícone */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MedicineBoxOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Tratamentos
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Tabs e Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <Tabs
                  activeKey={tratamentoTabKey}
                  onChange={setTratamentoTabKey}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: 'tratamentos',
                      label: 'Tratamentos'
                    }
                  ]}
                />
              </div>
              <div>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Pesquisar..."
                  value={searchText}
                  onChange={handleSearchInput}
                  allowClear
                  style={{
                    width: 320,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Conteúdo das Tabs */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('tratamento')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Tratamento
            </Button>
            <Table
              columns={tratamentosColumns}
              dataSource={tratamentos}
              rowKey="id"
              pagination={{
                pageSize: 3,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editType === 'tratamento' ? (editRecord ? 'Editar Tratamento' : 'Novo Tratamento') : ''}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Tratamento" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do tratamento" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição do tratamento" rows={3} />
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
              .ant-table-thead > tr > th {
                background: #e8eefc !important;
                color: #2d3a4a !important;
                font-weight: 600;
                font-size: 15px;
              }
              .ant-table-row-light {
                background: #ffffff;
              }
              .ant-table-row-dark {
                background: #f6f8fa;
              }
              .ant-table-tbody > tr:hover > td {
                background: #e0f2fe !important;
              }
              .ant-btn-primary {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
              }
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Especialidade/Serviços
  if (view === 'especialidade') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
            style={{
              boxShadow: '0 2px 8px #f0f1f2',
              borderRadius: 8,
              background: '#fff',
              margin: '0 auto'
            }}
          >
            {/* Header com Ícone */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AppstoreAddOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Especialidades & Serviços
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Tabs e Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <Tabs
                  activeKey={tabKey}
                  onChange={setTabKey}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: 'servicos',
                      label: 'Serviços'
                    },
                    {
                      key: 'especialidades',
                      label: 'Especialidades'
                    }
                  ]}
                />
              </div>
              <div>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Pesquisar..."
                  value={searchText}
                  onChange={handleSearchInput}
                  allowClear
                  style={{
                    width: 320,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Conteúdo das Tabs */}
            {tabKey === 'servicos' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('servico')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Novo Serviço
                </Button>
                <Table
                  columns={servicosColumns}
                  dataSource={servicos}
                  rowKey="id"
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : tabKey === 'especialidades' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('especialidade')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Nova Especialidade
                </Button>
                <Table
                  columns={especialidadesColumns}
                  dataSource={especialidades}
                  rowKey="id"
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : null}

            <Modal
              open={modalVisible}
              title={editType === 'especialidade' ? (editRecord ? 'Editar Especialidade' : 'Nova Especialidade') : (editType === 'servico' ? (editRecord ? 'Editar Serviço' : 'Novo Serviço') : '')}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'especialidade' ? (
                  <>
                    <Form.Item name="nome" label="Nome da Especialidade" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome da especialidade" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input.TextArea placeholder="Digite a descrição da especialidade" rows={3} />
                    </Form.Item>
                  </>
                ) : editType === 'servico' ? (
                  <>
                    <Form.Item name="especialidade" label="Especialidade" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione a especialidade">
                        {especialidades.map(e => (
                          <Select.Option key={e.id} value={e.id}>{e.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="tratamento" label="Tratamento" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tratamento">
                        {tratamentos.map(t => (
                          <Select.Option key={t.id} value={t.id}>{t.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tipo de utente">
                        {tiposUtente.map(t => (
                          <Select.Option key={t.id} value={t.id}>{t.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="valor" label="Valor a Pagar" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <InputNumber min={0} style={{ width: '100%' }} addonAfter="MZN" />
                    </Form.Item>
                    <Form.Item name="estado" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select>
                        <Select.Option value="Ativo">Ativo</Select.Option>
                        <Select.Option value="Inativo">Inativo</Select.Option>
                      </Select>
                    </Form.Item>
                  </>
                ) : null}
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
              .ant-table-thead > tr > th {
                background: #e8eefc !important;
                color: #2d3a4a !important;
                font-weight: 600;
                font-size: 15px;
              }
              .ant-table-row-light {
                background: #ffffff;
              }
              .ant-table-row-dark {
                background: #f6f8fa;
              }
              .ant-table-tbody > tr:hover > td {
                background: #e0f2fe !important;
              }
              .ant-btn-primary {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
              }
            `}</style>
          </Card>
        </div>
      </div>
    );
  }
  
  // View de Unidade Orgânica
  if (view === 'unidadeOrganica') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
          <Card
            style={{
              boxShadow: '0 2px 8px #f0f1f2',
              borderRadius: 8,
              background: '#fff',
              margin: '0 auto'
            }}
          >
            {/* Header com Ícone */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AppstoreAddOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Unidades Orgânicas
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Pesquisar..."
                  value={searchText}
                  onChange={handleSearchInput}
                  allowClear
                  style={{
                    width: 320,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    padding: '8px 12px',
                  }}
                />
              </div>
            </div>

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('unidadeOrganica')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Nova Unidade Orgânica
            </Button>
            <Table
              columns={unidadesOrganicasColumns}
              dataSource={unidadesOrganicas}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Unidade Orgânica' : 'Nova Unidade Orgânica'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome da Unidade Orgânica" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome da unidade orgânica" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição da unidade orgânica" rows={3} />
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
              .ant-table-thead > tr > th {
                background: #e8eefc !important;
                color: #2d3a4a !important;
                font-weight: 600;
                font-size: 15px;
              }
              .ant-table-row-light {
                background: #ffffff;
              }
              .ant-table-row-dark {
                background: #f6f8fa;
              }
              .ant-table-tbody > tr:hover > td {
                background: #e0f2fe !important;
              }
              .ant-btn-primary {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
              }
            `}</style>
          </Card>
        </div>
      </div>
    );
  }
};

export default Parametrizacao;
