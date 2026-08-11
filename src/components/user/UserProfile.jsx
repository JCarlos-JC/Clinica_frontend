import React, { useEffect, useState } from 'react';
import { Card, Avatar, Form, Input, Button, Row, Col, message, Tabs, Skeleton, Alert } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined } from '@ant-design/icons';
import authService from '../../services/authService';

const { TabPane } = Tabs;

const UserProfile = () => {
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [user, setUser] = useState(() => authService.getUser());
    const [loading, setLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState(!authService.getUser());

    useEffect(() => {
        let mounted = true;

        const hydrateUser = async () => {
            const storedUser = authService.getUser();
            if (storedUser && mounted) {
                setUser(storedUser);
                form.setFieldsValue({
                    nome: storedUser.nome || storedUser.name,
                    apelido: storedUser.apelido || '',
                    email: storedUser.email,
                    phone: storedUser.telefone || storedUser.celular || storedUser.phone || '',
                    department: storedUser.departamento || storedUser.department || '',
                    role: storedUser.cargo || storedUser.role || storedUser.tipo_usuario || '',
                });
            }

            try {
                const freshUser = await authService.getCurrentUser();
                if (freshUser && mounted) {
                    setUser(freshUser);
                    form.setFieldsValue({
                        nome: freshUser.nome || freshUser.name,
                        apelido: freshUser.apelido || '',
                        email: freshUser.email,
                        phone: freshUser.telefone || freshUser.celular || freshUser.phone || '',
                        department: freshUser.departamento || freshUser.department || '',
                        role: freshUser.cargo || freshUser.role || freshUser.tipo_usuario || '',
                    });
                }
            } finally {
                if (mounted) setLoadingUser(false);
            }
        };

        hydrateUser();
        return () => { mounted = false; };
    }, [form]);

    const handleProfileUpdate = async (values) => {
        setLoading(true);
        try {
            const result = await authService.updateCurrentUser(values);
            if (!result.success) {
                message.error(result.message || 'Não foi possível atualizar o perfil');
                return;
            }
            setUser(result.data);
            message.success('Perfil atualizado com sucesso!');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (values) => {
        setLoading(true);
        try {
            const result = await authService.changePassword(
                values.currentPassword,
                values.newPassword,
                values.confirmPassword
            );

            if (!result.success) {
                message.error(result.message || 'Não foi possível alterar a senha');
                return;
            }

            message.success('Senha alterada com sucesso!');
            passwordForm.resetFields();
        } finally {
            setLoading(false);
        }
    };

    if (loadingUser && !user) {
        return <Card style={{ maxWidth: 1000, margin: '20px auto' }}><Skeleton active avatar paragraph={{ rows: 6 }} /></Card>;
    }

    if (!user) {
        return <Alert type="warning" showIcon message="Sessão não encontrada" description="Faça login novamente para consultar o seu perfil." />;
    }

    return (
        <div style={{ maxWidth: 1000, margin: '20px auto' }}>
        <Card 
            title="Meu Perfil" 
            bordered={false}
            extra={
                <Button type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} onClick={() => window.history.back()}>Voltar</Button> 

            }   
        >
                <Row gutter={24}>
                    <Col xs={24} md={8}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <Avatar size={100} icon={<UserOutlined />} />
                            <h2 style={{ marginTop: 16 }}>{user.nome || user.name}</h2>
                            <p>{user.cargo || user.role || user.tipo_usuario || 'Função não especificada'}</p>
                            <p>{user.departamento || user.department || 'Departamento não especificado'}</p>
                        </div>
                    </Col>

                    <Col xs={24} md={16}>
                        <Tabs defaultActiveKey="profile">
                            <TabPane tab="Informações Pessoais" key="profile">
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleProfileUpdate}
                                >
                                    <Form.Item
                                        name="nome"
                                        label="Nome"
                                        rules={[{ required: true, message: 'Por favor, informe seu nome' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Nome" />
                                    </Form.Item>

                                    <Form.Item
                                        name="apelido"
                                        label="Apelido"
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Apelido" />
                                    </Form.Item>

                                    <Form.Item
                                        name="email"
                                        label="E-mail"
                                        rules={[
                                            { required: true, message: 'Por favor, informe seu e-mail' },
                                            { type: 'email', message: 'E-mail inválido' }
                                        ]}
                                    >
                                        <Input prefix={<MailOutlined />} placeholder="E-mail" />
                                    </Form.Item>

                                    <Form.Item
                                        name="phone"
                                        label="Telefone"
                                    >
                                        <Input prefix={<PhoneOutlined />} placeholder="Telefone" />
                                    </Form.Item>

                                    <Form.Item
                                        name="department"
                                        label="Departamento"
                                    >
                                        <Input placeholder="Departamento" />
                                    </Form.Item>

                                    <Form.Item
                                        name="role"
                                        label="Função"
                                    >
                                        <Input placeholder="Função" disabled />
                                    </Form.Item>

                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" loading={loading}>
                                            Atualizar Perfil
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </TabPane>

                            <TabPane tab="Alterar Senha" key="password">
                                <Form
                                    form={passwordForm}
                                    layout="vertical"
                                    onFinish={handlePasswordChange}
                                >
                                    <Form.Item
                                        name="currentPassword"
                                        label="Senha Atual"
                                        rules={[{ required: true, message: 'Por favor, informe sua senha atual' }]}
                                    >
                                        <Input.Password prefix={<LockOutlined />} placeholder="Senha Atual" />
                                    </Form.Item>

                                    <Form.Item
                                        name="newPassword"
                                        label="Nova Senha"
                                        rules={[
                                            { required: true, message: 'Por favor, informe a nova senha' },
                                            { min: 6, message: 'A senha deve ter no mínimo 6 caracteres' }
                                        ]}
                                    >
                                        <Input.Password prefix={<LockOutlined />} placeholder="Nova Senha" />
                                    </Form.Item>

                                    <Form.Item
                                        name="confirmPassword"
                                        label="Confirmar Nova Senha"
                                        dependencies={['newPassword']}
                                        rules={[
                                            { required: true, message: 'Por favor, confirme sua nova senha' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('newPassword') === value) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('As senhas não conferem!'));
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password prefix={<LockOutlined />} placeholder="Confirmar Nova Senha" />
                                    </Form.Item>

                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" loading={loading} >
                                            Alterar Senha
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </TabPane>
                        </Tabs>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default UserProfile;
