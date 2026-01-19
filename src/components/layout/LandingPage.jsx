import React, { useState } from 'react';
import { Layout, Button, Row, Col, Typography, Card, Modal, Divider } from 'antd';
import { UserOutlined, MedicineBoxOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import Login from '../auth/Login';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const LandingPage = () => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const navigate = useNavigate();

  const showLoginModal = () => {
    setIsLoginModalVisible(true);
  };

  const handleLoginModalCancel = () => {
    setIsLoginModalVisible(false);
  };

  const handleEnterSystem = () => {
    navigate('/home');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>      {/* Header com botão Entrar */}
      <Layout.Header style={{ 
        background: '#fff', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 40px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        height: 'auto',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <img
            src="/assets/images/UEM.png"
            alt="Logo"
            style={{ height: 50 }}
          />
          <Divider type="vertical" style={{ height: 40, margin: '0 16px', borderColor: '#28a745' }} />
          <Title level={4} style={{ margin: 0, color: '#28a745' }}>
            Clínica Universitária
          </Title>
        </div>
        <Button 
          type="primary" 
          size="large"
          icon={<UserOutlined />}
          onClick={showLoginModal}
          style={{ 
            background: '#28a745', 
            borderColor: '#28a745',
            borderRadius: '4px',
            height: '40px'
          }}
        >
          Entrar
        </Button>
      </Layout.Header>      <div style={{ 
        background: 'linear-gradient(rgba(40, 167, 69, 0.8), rgba(40, 167, 69, 0.8)), url("/assets/images) center/cover',
        padding: '80px 20px',
        textAlign: 'center',
        color: 'white'
      }}>
        <Title style={{ color: 'white', fontSize: '42px', marginBottom: '24px' }}>
          Sistema da Clínica Universitária
        </Title>
        <Paragraph style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto' }}>
          Oferecendo cuidados de saúde de qualidade para a comunidade universitária e público em geral.
        </Paragraph>
        <Button 
          type="default" 
          size="large" 
          onClick={handleEnterSystem}
          style={{ 
            marginTop: '32px', 
            height: '48px',
            borderRadius: '24px',
            padding: '0 32px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: 'white',
            color: '#28a745',
            border: 'none'
          }}
        >
          Conheça Nossos Serviços
        </Button>
      </div>

      <Content style={{ padding: '60px 50px', background: '#f5f5f5' }}>
        {/* Seção de Informações */}
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '48px', color: '#333' }}>
            Nossa Clínica Universitária
          </Title>
          
          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} sm={12} lg={8}>
              <Card 
                style={{ height: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                hoverable
              >
                <MedicineBoxOutlined style={{ fontSize: '48px', color: '#28a745', marginBottom: '16px' }} />
                <Title level={4}>Atendimento Especializado</Title>
                <Paragraph>
                  Oferecemos consultas em diversas especialidades médicas com profissionais qualificados e estudantes supervisionados.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                style={{ height: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                hoverable
              >
                <ClockCircleOutlined style={{ fontSize: '48px', color: '#28a745', marginBottom: '16px' }} />
                <Title level={4}>Horário Estendido</Title>
                <Paragraph>
                  Atendimento de segunda a sexta-feira, das 7h às 19h, para melhor atender às necessidades da comunidade.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                style={{ height: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                hoverable
              >
                <TeamOutlined style={{ fontSize: '48px', color: '#28a745', marginBottom: '16px' }} />
                <Title level={4}>Equipe Multidisciplinar</Title>
                <Paragraph>
                  Nossa equipe inclui médicos, enfermeiros, fisioterapeutas e outros profissionais para um cuidado completo.
                </Paragraph>
              </Card>
            </Col>
          </Row>

          {/* Informações adicionais */}
          <div style={{ margin: '60px 0', textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: '32px', color: '#333' }}>
              Sobre a Clínica Universitária
            </Title>
            <Paragraph style={{ fontSize: '16px', maxWidth: '900px', margin: '0 auto', textAlign: 'justify' }}>
              A Clínica Universitária da Universidade Eduardo Mondlane foi fundada com o objetivo de oferecer atendimento médico de qualidade à comunidade acadêmica e à população em geral, além de proporcionar um espaço de aprendizado prático para os estudantes da área de saúde.
            </Paragraph>
            <Paragraph style={{ fontSize: '16px', maxWidth: '900px', margin: '16px auto', textAlign: 'justify' }}>
              Contamos com uma estrutura moderna, equipamentos de última geração e profissionais altamente qualificados. Nossa missão é promover a saúde e o bem-estar, aliando conhecimento científico à prática humanizada.
            </Paragraph>
          </div>

          {/* Estatísticas */}
          <Row gutter={[32, 32]} justify="center" style={{ margin: '48px 0' }}>
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', borderRadius: '8px', background: '#28a745', color: 'white' }}>
                <Title level={2} style={{ color: 'white', margin: 0 }}>+15.000</Title>
                <Text style={{ color: 'white', fontSize: '16px' }}>Atendimentos por ano</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', borderRadius: '8px', background: '#28a745', color: 'white' }}>
                <Title level={2} style={{ color: 'white', margin: 0 }}>+20</Title>
                <Text style={{ color: 'white', fontSize: '16px' }}>Especialidades médicas</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', borderRadius: '8px', background: '#28a745', color: 'white' }}>
                <Title level={2} style={{ color: 'white', margin: 0 }}>+50</Title>
                <Text style={{ color: 'white', fontSize: '16px' }}>Profissionais qualificados</Text>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>      <Footer />

      {/* Modal de Login */}
      <Modal
        open={isLoginModalVisible}
        onCancel={handleLoginModalCancel}
        footer={null}
        width={400}
        centered
        destroyOnClose
        bodyStyle={{ padding: 0 }}
      >
        <Login isModal={true} />
      </Modal>
    </Layout>
  );
};

export default LandingPage;
