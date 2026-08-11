import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../../services/authService';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Se não há role requerido, permite acesso
  if (!requiredRole) {
    return children;
  }

  // Mapeamento de roles (tipo_usuario do backend -> role do frontend)
  const roleMapping = {
    'admin': 'admin',
    'medico': 'medico',
    'enfermeiro': 'enfermeiro',
    'recepcionista': 'aceitacao',
    'laboratorista': 'analista',
    'farmaceutico': 'farmaceutico'
  };

  const userRole = roleMapping[user.tipo_usuario] || user.tipo_usuario;

  // Admin tem acesso a tudo
  if (userRole === 'admin' || user.tipo_usuario === 'admin') {
    return children;
  }

  // Verifica se o role do usuário corresponde ao requerido
  if (userRole !== requiredRole) {
    // Redireciona para a página apropriada baseado no role
    switch (userRole) {
      case 'medico':
        return <Navigate to="/consultorio" replace />;
      case 'enfermeiro':
        return <Navigate to="/enfermaria" replace />;
      case 'aceitacao':
        return <Navigate to="/atendimento" replace />;
      case 'analista':
        return <Navigate to="/laboratorio" replace />;
      case 'farmaceutico':
        return <Navigate to="/farmacia" replace />;
      default:
        return <Navigate to="/home" replace />;
    }
  }

  // Se passou por todas as verificações, permite acesso
  return children;
};

export default ProtectedRoute;