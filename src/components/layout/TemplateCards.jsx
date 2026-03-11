import React, { useContext, useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Layout, Badge, Typography, Divider, Alert } from 'antd';
import { Link } from 'react-router-dom';
import {
  UserAddOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  LockOutlined,
  UserOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { Pie, Column } from '@ant-design/plots';
import NavbarTemplate from './NavbarTemplate';
import { ClinicContext } from '../../context/ClinicContext';
import authService from '../../services/authService';

const { Content } = Layout;
const { Title } = Typography;

// Define a CSS style for fade-in and fade-out animations and card hover effects
const fadeInOutStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  
  .fade-in {
    animation: fadeIn 0.5s ease forwards;
  }
  
  .fade-out {
    animation: fadeOut 0.5s ease forwards;
  }
  
  .card-hover {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .card-hover:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
  
  .card-hover:hover .ant-card-body {
    background-color: #f9f9f9;
  }
  
  .card-hover:hover svg {
    transform: scale(1.1);
    transition: transform 0.3s ease;
  }
  
  .card-hover:hover h3 {
    color: #1890ff;
  }
`;

const TemplateCards = () => {
  // ✅ Pegar user do authService
  const currentUser = authService.getUser();

  const {
    user,
    pacientes = [],
    triagensRealizadas = [],
    consultasRealizadas = [],
    triagensPendentes = [],
    consultasPendentes = [],
    examesPendentes = [],
    examesConcluidos = []
  } = useContext(ClinicContext);

  // State para controlar a visibilidade da mensagem de boas-vindas
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [fadeOutClass, setFadeOutClass] = useState('');

  // useEffect para esconder a mensagem após 3 segundos
  useEffect(() => {
    if (showWelcomeMessage) {
      const fadeTimer = setTimeout(() => {
        setFadeOutClass('fade-out');
      }, 2500);

      const hideTimer = setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 3000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [showWelcomeMessage]);

  // Usar useMemo para calcular estatísticas apenas quando os dados mudarem
  const statistics = useMemo(() => {
    return {
      totalPacientes: pacientes?.length || 0,
      totalTriagens: triagensRealizadas?.length || 0,
      totalConsultas: consultasRealizadas?.length || 0,
      totalTriagensPendentes: triagensPendentes?.length || 0,
      totalConsultasPendentes: consultasPendentes?.length || 0,
      totalExamesPendentes: examesPendentes?.length || 0,
      totalExamesConcluidos: examesConcluidos?.length || 0,
      consultasFinalizadas: consultasRealizadas?.filter(c => c.status === 'alta')?.length || 0,
      consultasObitos: consultasRealizadas?.filter(c => c.status === 'obito')?.length || 0,
    };
  }, [
    pacientes,
    triagensRealizadas,
    consultasRealizadas,
    triagensPendentes,
    consultasPendentes,
    examesPendentes,
    examesConcluidos
  ]);

  const consultasTransferidas = consultasRealizadas?.filter(c => c.status === 'transferido')?.length || 0;

  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const formatarData = (data) => {
    if (!data) return null;
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  };

  const dataHoje = formatarData(hoje);

  const pacientesHoje = pacientes?.filter(p => {
    if (!p.dataCadastro) return false;
    const dataCadastro = formatarData(new Date(p.dataCadastro));
    return dataCadastro === dataHoje;
  })?.length || 0;

  const pacientesEmProcesso = pacientes?.filter(p => {
    const temTriagem = triagensRealizadas?.some(t => t.pacienteId === p.id);
    const naoTemAlta = !consultasRealizadas?.some(c => c.pacienteId === p.id && c.status === 'alta');
    return temTriagem && naoTemAlta;
  })?.length || 0;

  const pieData = [
    { type: 'Triagens', value: statistics.totalTriagens || 0 },
    { type: 'Consultas', value: statistics.totalConsultas || 0 },
    { type: 'Altas Médicas', value: statistics.consultasFinalizadas || 0 },
  ].filter(item => item.value > 0);

  const hasPieData = pieData.length > 0;

  const pieConfig = {
    appendPadding: 10,
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      formatter: (datum) => {
        if (!datum || typeof datum !== 'object') return '';
        return `${datum.type}: ${(datum.percent * 100).toFixed(0)}%`;
      },
      style: {
        fontSize: 12,
        textAlign: 'center',
        fill: '#333'
      }
    },
    legend: {
      position: 'bottom',
      layout: 'horizontal',
      itemName: {
        style: {
          fontSize: 12,
          fill: '#333'
        }
      }
    },
    tooltip: {
      showTitle: false,
      showMarkers: false,
      formatter: (datum) => {
        return {
          name: datum.type,
          value: datum.value
        };
      }
    },
    interactions: [{ type: 'element-active' }],
    statistic: {
      title: {
        style: {
          fontSize: '14px',
          color: '#28a745'
        },
        formatter: () => 'Total'
      },
      content: {
        style: {
          fontSize: '16px',
          color: '#333'
        },
        formatter: (_, data) => {
          if (!data || !Array.isArray(data) || data.length === 0) return '0';
          return data.reduce((prev, curr) => prev + (Number(curr?.value) || 0), 0);
        }
      }
    }
  };

  const columnData = [
    { month: 'Janeiro', pacientes: 10 },
    { month: 'Fevereiro', pacientes: 20 },
    { month: 'Março', pacientes: 30 },
    { month: 'Abril', pacientes: 40 },
    { month: 'Maio', pacientes: statistics.totalPacientes },
  ];

  const columnConfig = {
    data: columnData,
    xField: 'month',
    yField: 'pacientes',
    color: '#5B8FF9',
    label: {
      position: 'top',
      style: {
        fill: '#000000',
        opacity: 0.8,
      },
    },
    meta: {
      pacientes: { alias: 'Pacientes' },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    yAxis: {
      label: {
        formatter: (v) => `${v}`,
      },
    },
    columnStyle: {
      radius: [8, 8, 0, 0],
    },
    interactions: [{ type: 'element-active' }],
  };

  // ✅ CORRIGIDO: Calcular cardData com useMemo sem incluir allCards nas dependências
  const cardData = useMemo(() => {
    // ✅ Definir allCards DENTRO do useMemo para usar statistics atualizadas
    const allCards = [
      {
        key: 'atendimento',
        title: 'Aceitação',
        icon: <UserAddOutlined style={{ fontSize: '24px', color: '#28a745' }} />,
        route: '/atendimento',
        role: 'aceitacao',
        counts: [
          { title: 'Utentes', value: pacientesHoje, color: '#52c41a' },
          { title: 'Em Processo', value: pacientesEmProcesso, color: '#fa8c16' },
          { title: 'Transferências', value: consultasTransferidas, color: '#722ed1' }
        ]
      },
      {
        key: 'enfermaria',
        title: 'Triagem',
        icon: <MedicineBoxOutlined style={{ fontSize: '24px', color: '#28a745' }} />,
        route: '/enfermaria',
        role: 'enfermeiro',
        counts: [
          { title: 'Em Espera', value: statistics.totalTriagensPendentes, color: '#fa8c16' },
          { title: 'Realizadas', value: statistics.totalTriagens, color: '#52c41a' }
        ]
      },
      {
        key: 'consultorio',
        title: 'Consultório',
        icon: <MedicineBoxOutlined style={{ fontSize: '24px', color: '#28a745' }} />,
        route: '/consultorio',
        role: 'medico',
        counts: [
          { title: 'Em Espera', value: statistics.totalConsultasPendentes, color: '#fa8c16' },
          { title: 'Finalizadas', value: statistics.consultasFinalizadas, color: '#52c41a' },
          { title: 'Óbitos', value: statistics.consultasObitos, color: '#f5222d' }
        ]
      },
      {
        key: 'laboratorio',
        title: 'Laboratório',
        icon: <ExperimentOutlined style={{ fontSize: '24px', color: '#28a745' }} />,
        route: '/laboratorio',
        role: 'analista',
        counts: [
          { title: 'Pendentes', value: statistics.totalExamesPendentes, color: '#fa8c16' },
          { title: 'Concluídos', value: statistics.totalExamesConcluidos, color: '#52c41a' }
        ]
      },
      {
        key: 'parametrizacao',
        title: 'Parametrização',
        icon: <FileTextOutlined style={{ fontSize: '24px', color: '#28a745' }} />,
        route: '/parametrizacao',
        role: 'admin',
        counts: []
      }
    ];

    if (!currentUser) {
      return [];
    }

    // Verificar se é admin
    const isAdmin = currentUser.tipo_usuario === 'admin' ||
      currentUser.roles?.includes('admin');


    // Admin vê todos os cards
    if (isAdmin) {
      return allCards;
    }

    // Mapeamento de tipo_usuario para role dos cards
    const roleMapping = {
      'recepcionista': 'aceitacao',
      'enfermeiro': 'enfermeiro',
      'medico': 'medico',
      'laboratorista': 'analista',
      'farmaceutico': 'farmaceutico'
    };

    const userCardRole = roleMapping[currentUser.tipo_usuario] || currentUser.tipo_usuario;


    // Filtrar cards baseado no role do usuário
    const filteredCards = allCards.filter(card => card.role === userCardRole);


    return filteredCards;
  }, [
    currentUser,
    statistics,
    pacientesHoje,
    pacientesEmProcesso,
    consultasTransferidas
  ]); // ✅ Dependências corretas

  // ✅ Usar currentUser para exibir nome
  const displayUser = currentUser || user;


  return (
    <Layout>
      <style>{fadeInOutStyle}</style>

      <NavbarTemplate />
      <Content style={{ background: '#f5f5f5', padding: '16px 0' }}>
        <div className="container" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ padding: '15px' }}>
            {showWelcomeMessage && displayUser && (
              <Alert
                message={
                  <h2 style={{
                    margin: 0,
                    color: '#28a745',
                    fontSize: '18px'
                  }}>
                    <UserOutlined style={{ marginRight: '8px' }} />
                    Bem-vindo, {displayUser.nome || displayUser.name}
                  </h2>
                }
                description={
                  <p style={{ margin: 0, color: '#666' }}>
                    Você está conectado como <strong>{displayUser.cargo || displayUser.department}</strong> com a função de{' '}
                    <strong>
                      {displayUser.tipo_usuario === 'admin' || displayUser.role === 'admin'
                        ? 'Administrador'
                        : displayUser.tipo_usuario || displayUser.role}
                    </strong>
                  </p>
                }
                type="success"
                showIcon={false}
                className={`fade-in ${fadeOutClass}`}
                style={{
                  marginBottom: '24px',
                  borderRadius: '8px',
                  border: '1px solid #d6e4ff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                banner
              />
            )}

            <Row gutter={[16, 16]} justify="center">
              {cardData.length === 0 ? (
                <Col span={24}>
                  <Alert
                    message="❌ Nenhum card disponível"
                    description={
                      <>
                        <p>Você não tem permissão para acessar nenhum módulo.</p>
                        <p><strong>Usuário atual:</strong> {currentUser?.nome || 'Não identificado'}</p>
                        <p><strong>Tipo:</strong> {currentUser?.tipo_usuario || 'Não definido'}</p>
                        <p><strong>Roles:</strong> {JSON.stringify(currentUser?.roles) || 'Não definido'}</p>
                      </>
                    }
                    type="warning"
                    showIcon
                  />
                </Col>
              ) : (
                cardData.map((card) => (
                  <Col key={card.key}
                    xs={24}
                    sm={cardData.length === 1 ? 24 : 12}
                    md={cardData.length === 1 ? 12 : (cardData.length <= 2 ? 12 : 8)}
                    lg={cardData.length === 1 ? 8 : 6}
                    style={{ display: 'flex' }}
                  >
                    <Link to={card.route} style={{ width: '100%' }}>
                      <Card
                        hoverable
                        size="small"
                        style={{
                          width: '100%',
                          height: '100%',
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        bodyStyle={{
                          padding: '20px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          justifyContent: 'space-between'
                        }}
                        className="card-hover"
                      >
                        <div>
                          <div style={{ marginBottom: 12, position: 'relative' }}>
                            {card.icon}
                            {card.requiresAuth && (
                              <LockOutlined
                                style={{
                                  position: 'absolute',
                                  top: -6,
                                  right: -6,
                                  color: '#f5222d',
                                  fontSize: '12px',
                                  background: '#fff',
                                  borderRadius: '50%',
                                  padding: '2px'
                                }}
                              />
                            )}
                          </div>
                          <h3 style={{
                            margin: '0 0 14px 0',
                            color: '#28a745',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            transition: 'color 0.3s ease'
                          }}>
                            {card.title}
                          </h3>
                        </div>

                        {card.counts && card.counts.length > 0 && (
                          <div style={{ marginTop: 'auto' }}>
                            <Row gutter={[8, 8]} justify="center" style={{ display: 'flex', flexWrap: 'wrap' }}>
                              {card.counts.map((count, index) => {
                                let spanWidth;
                                if (card.counts.length === 2) {
                                  spanWidth = 12;
                                } else if (card.counts.length === 3) {
                                  spanWidth = 8;
                                } else {
                                  spanWidth = 6;
                                }

                                return (
                                  <Col key={index} span={spanWidth} style={{ display: 'flex', justifyContent: 'center' }}>
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      padding: '9px 0',
                                      width: '100%'
                                    }}>
                                      <Badge
                                        count={count.value}
                                        style={{
                                          backgroundColor: count.color,
                                          fontSize: '12px',
                                          fontWeight: 'bold',
                                          minWidth: '32px',
                                          height: '24px',
                                          padding: '0 8px',
                                          lineHeight: '24px',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                          transition: 'all 0.3s ease'
                                        }}
                                        showZero
                                      />
                                      <span style={{
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        color: '#555',
                                        marginTop: '8px',
                                        whiteSpace: 'nowrap',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        {count.title}
                                      </span>
                                    </div>
                                  </Col>
                                );
                              })}
                            </Row>
                          </div>
                        )}
                      </Card>
                    </Link>
                  </Col>
                ))
              )}
            </Row>

            {/* Gráficos - só mostrar se tiver dados */}
            {(hasPieData || statistics.totalPacientes > 0) && (
              <>
                <Divider style={{ margin: '28px 0 22px' }}>
                  <Title level={4} style={{
                    color: '#28a745',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    <FileTextOutlined /> Gráficos de Desempenho
                  </Title>
                </Divider>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card
                      hoverable
                      size="small"
                      style={{
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      <Title level={5} style={{ margin: '0 0 12px 0', color: '#28a745', fontSize: '16px' }}>
                        Distribuição de Triagens e Consultas
                      </Title>
                      <div style={{ height: '175px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hasPieData ? (
                          <Pie {...pieConfig} />
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '200px',
                            color: '#999',
                            fontStyle: 'italic'
                          }}>
                            Não há dados suficientes para exibir o gráfico
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card
                      hoverable
                      size="small"
                      style={{
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        height: '100%'
                      }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      <Title level={5} style={{ margin: '0 0 12px 0', color: '#28a745', fontSize: '16px' }}>
                        Crescimento de Utentes
                      </Title>
                      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Column {...columnConfig} />
                      </div>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default TemplateCards;