import React, { useContext } from 'react';
import { Layout, Typography, Avatar, Dropdown, Menu } from 'antd';
import { DownOutlined, UserOutlined} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ClinicContext } from '../../context/ClinicContext';

const { Header } = Layout;
const { Title } = Typography;

const NavbarTemplate = () => {
  const { logout, user } = useContext(ClinicContext);
  const navigate = useNavigate();

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      // Forçando o redirecionamento para a página inicial
      setTimeout(() => {
        navigate('/');
      }, 0);
    }
    else if (key === 'profile') {
      navigate('/profile');
    }
  };


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
      
      <Dropdown overlay={menu}>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar icon={<UserOutlined />} />
          <span>{user?.name || 'Usuário'}</span>
          <DownOutlined />
        </div>
      </Dropdown>
    </Header>
  );
};

export default NavbarTemplate;
