import React, { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClinicContext } from '../../context/ClinicContext';
import { Layout, Dropdown, Typography, Menu, Avatar, Button } from 'antd';
import { 
  UserOutlined, 
  DownOutlined, 
  HomeOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const Navbar = () => {
  const { logout, user } = useContext(ClinicContext);
  const navigate = useNavigate();

  // Usar useCallback para evitar re-criação desnecessária da função
  const handleHomeClick = useCallback(() => {
    try {
      // Verificar se a navegação já está em andamento
      if (window.location.pathname === '/home') {
        window.location.reload(); // Se já estiver na home, apenas recarregar
        return;
      }
      
      // Navegar para home de forma mais robusta
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Erro ao navegar para home:', error);
      // Fallback: usar window.location como última opção
      window.location.href = '/home';
    }
  }, [navigate]);

  const handleMenuClick = useCallback(({ key }) => {
    try {
      if (key === 'logout') {
        logout();
        // Forçando o redirecionamento para a página inicial
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100); // Pequeno delay para garantir que o logout seja processado
      }
      else if (key === 'profile') {
        navigate('/profile', { replace: true });
      }
    } catch (error) {
      console.error('Erro no menu:', error);
    }
  }, [logout, navigate]);

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="profile">Ver Perfil</Menu.Item>
      <Menu.Item key="logout">Sair</Menu.Item>
    </Menu>
  );

  return (
    <Header
      style={{
        background: '#fff',
        borderBottom: '3px solid #28a745',
        padding: '15px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // Alterado para espaçar os elementos
        height: '102px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      justifyContent: 'center'
    }}>
        <div style={{ position: 'relative' }}>
          <img
            src="/assets/images/UEM.png"
            alt="Logo"
            style={{ height: 100 }} // Aumentei o tamanho da logo para melhor visibilidade
          />
        </div>

        <div
          style={{
            borderLeft: '2px solid #28a745',
            height: '50px',
            margin: '0 16px'
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <Title level={3} style={{ margin: 0, color: '#28a745' }}>
            Sistema da Clínica Universitária
          </Title>
          <span style={{ fontSize: 16, color: '#666', marginTop: 4 }}>
            SCLIUEM
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Navigation menu based on user role */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button 
            type="default" 
            icon={<HomeOutlined />} 
            onClick={handleHomeClick}
            title="Página Inicial"
            style={{ backgroundColor: '#28a745', color: 'white', borderColor: '#28a745' }}
            loading={false} // Evitar loading infinito
          >
            Home
          </Button>
          
        </div>

        <Dropdown overlay={menu}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.name || 'Usuário'}</span>
            <DownOutlined />
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};

export default Navbar;
