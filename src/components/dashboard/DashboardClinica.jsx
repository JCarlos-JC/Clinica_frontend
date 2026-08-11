import React, { useMemo } from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { Pie, Column } from '@ant-design/plots';
import { UserOutlined, MedicineBoxOutlined, FileDoneOutlined } from '@ant-design/icons';
import useClinicalBackendData from '../../hooks/useClinicalBackendData';

const { Title } = Typography;

const Dashboard = () => {
  const { pacientes = [], triagensRealizadas = [], consultasRealizadas = [], totals = {}, loading } = useClinicalBackendData();

  const totalPacientes = totals.pacientes ?? pacientes?.length ?? 0;
  const totalTriagens = totals.triagensRealizadas ?? triagensRealizadas?.length ?? 0;
  const totalConsultas = totals.consultasRealizadas ?? consultasRealizadas?.length ?? 0;

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

  const columnData = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const contagem = Array.from({ length: 12 }, (_, index) => ({ month: meses[index], pacientes: 0 }));

    pacientes.forEach((paciente) => {
      const dataCadastro = paciente.dataCadastro || paciente.data_cadastro || paciente.created_at;
      const data = dataCadastro ? new Date(dataCadastro) : null;
      if (data && !Number.isNaN(data.getTime())) {
        contagem[data.getMonth()].pacientes += 1;
      }
    });

    return contagem.filter(item => item.pacientes > 0);
  }, [pacientes]);

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
    background: 'linear-gradient(135deg, #f0faf7, #ffffff)',
    minHeight: 'calc(100vh - 64px)', // considerando header de 64px
    borderRadius: '8px',
  };

  const titleStyle = {
    marginBottom: '32px',
    color: '#722ed1',
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
            loading={loading}
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
            loading={loading}
            style={statisticCardStyle}
            hoverable
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ ...iconStyle, background: 'rgba(40, 167, 69, 0.1)', color: '#28a745' }}>
                <MedicineBoxOutlined />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 500 }}>Triagens</span>
            </div>
            <Statistic
              value={totalTriagens}
              valueStyle={{ color: '#28a745', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#718096' }}>
              Triagens realizadas
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            loading={loading}
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