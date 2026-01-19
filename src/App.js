// src/App.jsx
import React from 'react';
import { Layout } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ClinicProvider } from './context/ClinicContext';
import Navbar from './components/layout/Navbar';
import TemplateCards from './components/layout/TemplateCards'; 
import Footer from './components/layout/Footer';
import authService from './services/authService';

import CadastroPaciente from './components/atendimento/CadastroPaciente';
import TriagemPaciente from './components/enfermaria/TriagemPaciente';
import ConsultaPaciente from './components/consultorio/ConsultaPaciente';
import LaboratorioPaciente from './components/laboratorio/LaboratorioPaciente';
import Arquivo from './components/arquivo/Arquivo';
import Login from './components/auth/Login';
import UserProfile from './components/user/UserProfile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Parametrizacao from './components/parametrizacao/Parametrizacao';

const { Content } = Layout;

const App = () => {

  return (
    <ClinicProvider>
      <Router>
        <Routes>
          {/* Rota pública para a página de login como página principal */}
          <Route path="/" element={<Login />} />
          
          
          {/* Rota para home (cards) protegida - todos os usuários podem acessar após autenticação */}
          <Route path="/home" element={
            <ProtectedRoute>
              <TemplateCards />
            </ProtectedRoute>
          } />
          
          {/* Todas as outras rotas com Navbar */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout style={{ minHeight: '100vh' }}>
                <Navbar />
                <Layout>
                  <Layout style={{ padding: '15px 5px 5px' }}>
                    <Content>
                      <Routes>
                        {/* Public route */}
                        <Route path="/login" element={<Login />} />

                        {/* Redirect root */}
                        <Route
                          path="/"
                          element={
                            authService.isAuthenticated()
                              ? <Navigate to="/home" replace />
                              : <Navigate to="/login" replace />
                          }
                        />

                        {/* Rotas protegidas com controle de acesso baseado em função */}
                        <Route path="atendimento" element={
                          <ProtectedRoute requiredRole="aceitacao">
                            <CadastroPaciente />
                          </ProtectedRoute>
                        } />
                        
                        <Route path="enfermaria" element={
                          <ProtectedRoute requiredRole="enfermeiro">
                            <TriagemPaciente />
                          </ProtectedRoute>
                        } />
                        
                        <Route path="consultorio" element={
                          <ProtectedRoute requiredRole="medico">
                            <ConsultaPaciente />
                          </ProtectedRoute>
                        } />
                        
                        <Route path="laboratorio" element={
                          <ProtectedRoute requiredRole="analista">
                            <LaboratorioPaciente />
                          </ProtectedRoute>
                        } />
                        
                        <Route path="arquivo" element={
                          <ProtectedRoute requiredRole="admin">
                            <Arquivo />
                          </ProtectedRoute>
                        } />
                        <Route path="parametrizacao" element={
                          <ProtectedRoute requiredRole="admin">
                            <Parametrizacao />
                          </ProtectedRoute>
                        } />
                        {/* Perfil de usuário - qualquer usuário autenticado pode acessar */}
                        <Route path="profile" element={
                          <ProtectedRoute>
                            <UserProfile />
                          </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/home" />} />
                      </Routes>
                    </Content>
                    {/* <Footer /> */}
                  </Layout>
                </Layout>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </ClinicProvider>
  );
};

export default App;
