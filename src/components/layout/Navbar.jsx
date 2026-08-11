import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { Layout, Dropdown, Typography, Menu, Avatar, Button } from 'antd';
import { 
  UserOutlined, 
  DownOutlined, 
  HomeOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const Navbar = () => {
  const navigate = useNavigate();
  const user = useMemo(() => authService.getUser(), []);

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
        authService.logout();
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
  }, [navigate]);

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="profile">Ver Perfil</Menu.Item>
      <Menu.Item key="logout">Sair</Menu.Item>
    </Menu>
  );

  return (
    <Header className="clinic-navbar">
      <div className="clinic-navbar-brand">
        <div style={{ position: 'relative' }}>
          <img
            src="/assets/images/UEM.png"
            alt="Logo"
            className="clinic-navbar-logo"
          />
        </div>

        <div className="clinic-navbar-divider" />

        <div className="clinic-navbar-title">
          <Title level={3}>
            Sistema da Clínica Universitária
          </Title>
          <span>
            SCLIUEM
          </span>
        </div>
      </div>

      <div className="clinic-navbar-actions">
        {/* Navigation menu based on user role */}
        <div className="clinic-navbar-links">
          <Button 
            type="default" 
            icon={<HomeOutlined />} 
            onClick={handleHomeClick}
            title="Página Inicial"
            className="clinic-home-button"
            loading={false} // Evitar loading infinito
          >
            Home
          </Button>
          
        </div>

        <Dropdown overlay={menu}>
          <div className="clinic-user-menu">
            <Avatar icon={<UserOutlined />} />
            <span>{user?.nome || user?.name || 'Usuário'}</span>
            <DownOutlined />
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};

export default Navbar;
