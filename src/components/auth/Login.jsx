import React, { useState } from 'react';
import { Card, Input, Button, message, Layout } from 'antd';
// import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const { Content } = Layout;

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    // const navigate = useNavigate();

    const handleLogin = async () => {
        if (!email || !password) {
            message.error('Por favor, preencha todos os campos!');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            message.error('Por favor, digite um e-mail válido!');
            return;
        }

        setLoading(true);

        try {

            const result = await authService.login(email, password);

            // console.log('Resultado do login:', result);

            if (result.success) {
                // const user = result.data.user;

                // console.log('Usuário logado:', user);
                // console.log('Token salvo:', localStorage.getItem('token'));
                // console.log('User salvo:', localStorage.getItem('user'));

                message.success(result.message || 'Login realizado com sucesso!');

                setTimeout(() => {
                    // console.log('Navegando para /home...');
                    window.location.href = '/home';
                }, 300);

            } else {
                console.error('Login falhou:', result.message);
                message.error(result.message || 'Usuário ou senha inválidos!');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            message.error('Erro ao realizar login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <style>{`
                body {
                  margin: 0;
                  padding: 0;
                  background-color: #f3f4f6;
                }
                
                .login-card {
                  width: 100%;
                  max-width: 400px;
                  border-radius: 8px;
                  box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
                }
                
                .login-card .ant-card-body {
                  padding: 40px 30px;
                }
                
                .login-logo {
                  height: 130px;
                  margin-bottom: 10px;
                }
                
                .login-title {
                  color: #28a745;
                  margin-bottom: 5px;
                  font-size: 20px;
                  font-weight: 600;
                }
                
                .login-subtitle {
                  color: #666;
                  font-weight: normal;
                  font-size: 16px;
                  margin-bottom: 30px;
                }
                
                .login-input {
                  height: 45px;
                  border-radius: 6px;
                  margin-bottom: 15px;
                }
                
                .login-button {
                  height: 45px;
                  background: #28a745;
                  border-color: #28a745;
                  border-radius: 6px;
                  font-size: 16px;
                  font-weight: 500;
                }
                
                .login-button:hover {
                  background: #218838;
                  border-color: #218838;
                }
                
                .login-footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 12px;
                  color: #888;
                }
            `}</style>

            <Content style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px 20px',
                backgroundColor: '#f3f4f6'
            }}>
                {/* ✅ Removido bordered={false} */}
                <Card className="login-card">
                    <div style={{ textAlign: 'center' }}>
                        <img
                            src="/assets/images/UEM.png"
                            alt="Logo UEM"
                            className="login-logo"
                        />
                        <h3 className="login-title">
                            Sistema da Clínica Universitária
                        </h3>
                        <h4 className="login-subtitle">
                            Bem-vindo
                        </h4>
                    </div>

                    <Input
                        className="login-input"
                        placeholder="Digite o seu e-mail"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        autoComplete="email"
                        autoFocus
                    />

                    <Input.Password
                        className="login-input"
                        placeholder="Digite a sua senha"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        autoComplete="current-password"
                    />

                    <Button
                        type="primary"
                        block
                        onClick={handleLogin}
                        loading={loading}
                        className="login-button"
                    >
                        {loading ? 'Entrando...' : 'Aceda à sua conta'}
                    </Button>

                    <div className="login-footer">
                        © {new Date().getFullYear()} CIUEM - Clínica Universitária
                    </div>
                </Card>
            </Content>
        </Layout>
    );
};

export default Login;