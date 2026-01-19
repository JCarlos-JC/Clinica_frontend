# 🔗 Guia de Integração Frontend React.js

## 📋 Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- React.js 18+
- axios

## 📦 Instalação

### 1. Instalar Dependências

```bash
npm install axios
# ou
yarn add axios
```

### 2. Configurar Variável de Ambiente

Crie um arquivo `.env` na raiz do seu projeto React:

```env
REACT_APP_API_URL=http://localhost:8000
```

## 📁 Estrutura de Arquivos

Copie os arquivos da pasta `frontend-integration` para o seu projeto React:

```
src/
├── services/
│   ├── api.js              # Configuração do Axios
│   ├── apiConfig.js        # Endpoints da API
│   └── services.js         # Serviços organizados
├── components/
│   ├── LoginComponent.jsx
│   ├── TriagensListComponent.jsx
│   ├── CreateTriagemComponent.jsx
│   └── ProtectedRoute.jsx
└── App.js
```

## 🚀 Como Usar

### 1. Importar Serviços

```javascript
import { authService, triagemService, configService } from './services/services';
```

### 2. Login

```javascript
// Login simples
const handleLogin = async () => {
  try {
    const response = await authService.login('123456789', 'password123');
    console.log('Usuário logado:', response.user);
    // Token é salvo automaticamente no localStorage
  } catch (error) {
    console.error('Erro no login:', error);
  }
};
```

### 3. Fazer Requisições Autenticadas

```javascript
// Listar triagens
const loadTriagens = async () => {
  try {
    const response = await triagemService.list({
      status: 'aguardando_triagem',
      page: 1,
    });
    console.log('Triagens:', response.data);
  } catch (error) {
    console.error('Erro:', error);
  }
};

// Criar triagem
const createTriagem = async () => {
  try {
    const response = await triagemService.create({
      paciente_id: 1,
      motivo: 'Febre alta',
      queixa_principal: 'Paciente com febre há 2 dias',
      classificacao_risco: 'urgente',
    });
    console.log('Triagem criada:', response.data);
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### 4. Usar Componentes Prontos

```javascript
import LoginComponent from './components/LoginComponent';
import TriagensListComponent from './components/TriagensListComponent';
import CreateTriagemComponent from './components/CreateTriagemComponent';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginComponent />} />
        
        <Route path="/triagens" element={
          <ProtectedRoute>
            <TriagensListComponent />
          </ProtectedRoute>
        } />
        
        <Route path="/triagens/new" element={
          <ProtectedRoute>
            <CreateTriagemComponent />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

## 🔐 Autenticação JWT

O token JWT é gerenciado automaticamente:

- **Salvo no localStorage** após login
- **Enviado automaticamente** em todas as requisições
- **Refresh automático** quando o token expira
- **Logout automático** se o refresh falhar

## 🌐 CORS Configurado

O CORS já está configurado no backend para aceitar requisições de:

- `http://localhost:3000` (Create React App)
- `http://localhost:3001`
- `http://localhost:5173` (Vite)

## 📊 Serviços Disponíveis

### Authentication
```javascript
authService.login(nid, password)
authService.logout()
authService.me()
authService.isAuthenticated()
authService.getCurrentUser()
```

### Triagens
```javascript
triagemService.list(params)
triagemService.create(data)
triagemService.show(id)
triagemService.update(id, data)
triagemService.delete(id)
triagemService.getPendentes()
triagemService.getConcluidas()
triagemService.getEstatisticas()
triagemService.realizar(id, data)
triagemService.agendarConsulta(id, data)
```

### Sinais Vitais
```javascript
sinaisVitaisService.list(params)
sinaisVitaisService.create(data)
sinaisVitaisService.show(id)
sinaisVitaisService.update(id, data)
sinaisVitaisService.delete(id)
sinaisVitaisService.getByTriagem(triagemId)
sinaisVitaisService.getCriticos()
sinaisVitaisService.getEstatisticas()
sinaisVitaisService.calcularIMC(peso, altura)
```

### Configurações
```javascript
configService.getProvincias()
configService.getDistritos()
configService.getBairros()
configService.getTiposDocumento()
configService.getEspecialidades()
configService.getMedicamentos()
// ... e muito mais
```

### Agendamentos
```javascript
agendamentoService.list(params)
agendamentoService.show(id)
agendamentoService.getAguardando()
agendamentoService.getHoje()
agendamentoService.confirmar(id)
agendamentoService.cancelar(id, motivo)
agendamentoService.remarcar(id, data)
```

## 🧪 Testando

### 1. Iniciar o Backend

```bash
# Terminal 1: API Gateway
cd api-gateway
php artisan serve --port=8000

# Terminal 2: Triage Service
cd services/triage-service
php artisan serve --port=8005

# Terminal 3: Auth Service
cd services/authentication-service
php artisan serve --port=8001
```

### 2. Iniciar o Frontend

```bash
npm start
# ou
yarn start
```

### 3. Testar Login

Acesse `http://localhost:3000/login` e faça login com:
- **NID**: `123456789`
- **Senha**: `password123`

## ⚡ Exemplos de Uso Rápido

### Componente de Dashboard

```javascript
import React, { useEffect, useState } from 'react';
import { triagemService, authService } from './services/services';

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Get current user
      const userData = authService.getCurrentUser();
      setUser(userData);

      // Get statistics
      const statsData = await triagemService.getEstatisticas();
      setStats(statsData.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Bem-vindo, {user?.name}!</h1>
      
      <div className="stats">
        <div className="stat-card">
          <h3>Triagens Pendentes</h3>
          <p>{stats.pendentes || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Triagens Concluídas Hoje</h3>
          <p>{stats.concluidas_hoje || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Pacientes Críticos</h3>
          <p>{stats.criticos || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

### Hook Customizado para Dados

```javascript
import { useState, useEffect } from 'react';

export const useTriagens = (filters = {}) => {
  const [triagens, setTriagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTriagens();
  }, [filters]);

  const loadTriagens = async () => {
    setLoading(true);
    try {
      const response = await triagemService.list(filters);
      setTriagens(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  return { triagens, loading, error, reload: loadTriagens };
};

// Uso:
const MyComponent = () => {
  const { triagens, loading, error, reload } = useTriagens({ status: 'pendente' });

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      {triagens.map(t => <div key={t.id}>{t.motivo}</div>)}
      <button onClick={reload}>Atualizar</button>
    </div>
  );
};
```

## 🎨 Estilização (Opcional)

Adicione estilos básicos em `App.css`:

```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #0056b3;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status.aguardando_triagem {
  background: #fff3cd;
  color: #856404;
}

.status.triagem_concluida {
  background: #d4edda;
  color: #155724;
}
```

## ✅ Checklist de Integração

- [ ] Axios instalado
- [ ] Arquivos de serviços copiados
- [ ] `.env` configurado com `REACT_APP_API_URL`
- [ ] CORS configurado no backend
- [ ] Backend rodando (portas 8000, 8001, 8005)
- [ ] Frontend rodando (porta 3000)
- [ ] Login funcionando
- [ ] Token sendo salvo no localStorage
- [ ] Requisições autenticadas funcionando

## 🆘 Troubleshooting

### Erro de CORS
- Verifique se o backend está rodando
- Confirme que a URL em `.env` está correta
- Verifique `config/cors.php` no backend

### Token não salvo
- Verifique o console do navegador
- Confirme que a resposta do login tem `access_token`
- Verifique o localStorage no DevTools

### 401 Unauthorized
- Token pode ter expirado
- Faça logout e login novamente
- Verifique se o token está sendo enviado no header

## 📚 Documentação Adicional

- Backend: `TODAS_AS_ROTAS.md`
- Testes: `TESTE_POSTMAN_RAPIDO.md`
- Comunicação: `COMUNICACAO_GATEWAY_TRIAGE.md`

## 🎉 Pronto!

Agora você tem uma integração completa entre React.js e Laravel com:

✅ Autenticação JWT  
✅ Interceptors para refresh automático  
✅ Serviços organizados  
✅ Componentes de exemplo  
✅ CORS configurado  
✅ Proteção de rotas  

Bom desenvolvimento! 🚀
