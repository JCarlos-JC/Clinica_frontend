// src/components/layout/Footer.jsx
import React from 'react';
import { Layout } from 'antd';

const { Footer: AntFooter } = Layout;

const Footer = () => {
  return (
    <AntFooter style={{ textAlign: 'center' }}>
      Clínica Universitaria ©2025 Criado por DDSA - UEM
    </AntFooter>
  );
};

export default Footer;
