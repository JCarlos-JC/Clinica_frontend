import React, { useContext } from 'react';
import { ClinicContext } from '../../context/ClinicContext';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { Pie, Column } from '@ant-design/plots';
import { UserOutlined, MedicineBoxOutlined, FileDoneOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Dashboard = () => {
  // Adicionar valores padrão para todas as variáveis
  const { pacientes = [], triagensRealizadas = [], consultasRealizadas = [] } = useContext(ClinicContext);

  // Adicionar verificações de segurança ao acessar propriedades
  const totalPacientes = pacientes?.length || 0;
  const totalTriagens = triagensRealizadas?.length || 0;
  const totalConsultas = consultasRealizadas?.length || 0;

  // Dados para o gráfico de Pizza com verificações de segurança
  const pieData = [
    {
      type: 'Triagens',
      value: totalTriagens,
    },
    {
      type: 'Consultas',
      value: totalConsultas,
    },
  ];

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    colors: ['#36CBCB', '#4E81EB'],
    legend: {
      layout: 'horizontal',
      position: 'bottom'
    }
  };

  // Dados para o gráfico de Coluna (barras) - Simulando crescimento
  const columnData = [
    { month: 'Janeiro', pacientes: 10 },
    { month: 'Fevereiro', pacientes: 20 },
    { month: 'Março', pacientes: 30 },
    { month: 'Abril', pacientes: 40 },
    { month: 'Maio', pacientes: totalPacientes }, // Usando a variável segura
  ];

  const columnConfig = {
    data: columnData,
    xField: 'month',
    yField: 'pacientes',
    color: '#5B8FF9',
    meta: {
      pacientes: { alias: 'Pacientes' },
    }
  };

  // Estilos para melhorar a UI
  const dashboardStyle = {
    padding: '24px',
    background: 'linear-gradient(to right, #BDBDBD, #edf2f7)',
    minHeight: 'calc(100vh - 64px)', // considerando header de 64px
    borderRadius: '8px',
  };

  const titleStyle = {
    marginBottom: '32px',
    color: '#2d3748',
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: 600,
  };

  const cardStyle = {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    height: '100%',
    overflow: 'hidden',
  };

  const statisticCardStyle = {
    ...cardStyle,
    background: 'white',
    border: '1px solid #e2e8f0',
  };

  const chartCardStyle = {
    ...cardStyle,
    padding: '12px',
    background: 'white',
  };

  const iconStyle = {
    fontSize: '24px',
    padding: '12px',
    borderRadius: '50%',
    marginRight: '8px',
  };

  return (
    <div style={dashboardStyle}>
      <Title level={2} style={titleStyle}>
        Dashboard da Clínica
      </Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Card
            style={statisticCardStyle}
            hoverable
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ ...iconStyle, background: 'rgba(24, 144, 255, 0.1)', color: '#1890ff' }}>
                <UserOutlined />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 500 }}>Pacientes</span>
            </div>
            <Statistic
              value={totalPacientes}
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#718096' }}>
              Total de pacientes cadastrados
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            style={statisticCardStyle}
            hoverable
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ ...iconStyle, background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>
                <MedicineBoxOutlined />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 500 }}>Triagens</span>
            </div>
            <Statistic
              value={totalTriagens}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#718096' }}>
              Triagens realizadas
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            style={statisticCardStyle}
            hoverable
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ ...iconStyle, background: 'rgba(245, 34, 45, 0.1)', color: '#f5222d' }}>
                <FileDoneOutlined />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 500 }}>Consultas</span>
            </div>
            <Statistic
              value={totalConsultas}
              valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#718096' }}>
              Consultas concluídas
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Card
            title="Proporção: Triagens vs Consultas"
            style={chartCardStyle}
            hoverable
            headStyle={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}
          >
            <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
              <Pie {...pieConfig} />
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Crescimento de Pacientes por Mês"
            style={chartCardStyle}
            hoverable
            headStyle={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}
          >
            <div style={{ height: '300px' }}>
              <Column {...columnConfig} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;