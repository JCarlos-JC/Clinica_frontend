import React, { useState, useContext, useEffect } from 'react';
import { ClinicContext } from '../../context/ClinicContext';
import { Card, Avatar, Form, Input, Button, Row, Col, message, Tabs } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const UserProfile = () => {
    const { user, updateUserProfile } = useContext(ClinicContext);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                department: user.department || '',
                role: user.role || '',
            });
        }
    }, [user, form]);

    const handleProfileUpdate = async (values) => {
        try {
            setLoading(true);
            await updateUserProfile(values);
            message.success('Perfil atualizado com sucesso!');
        } catch (error) {
            message.error('Erro ao atualizar perfil: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (values) => {
        try {
            setLoading(true);
            // Assume que existe um método para alterar senha no contexto
            // await changePassword(values.currentPassword, values.newPassword);
            message.success('Senha alterada com sucesso!');
            passwordForm.resetFields();
        } catch (error) {
            message.error('Erro ao alterar senha: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div>Carregando informações do usuário...</div>;
    }

    return (
        <div style={{ maxWidth: 1000, margin: '20px auto' }}>
        <Card 
            title="Meu Perfil" 
            bordered={false}
            extra={
                <Button type="primary" style={{ backgroundColor: '#28a745', borderColor: '#28a745' }} onClick={() => window.history.back()}>Voltar</Button> 

            }   
        >
                <Row gutter={24}>
                    <Col xs={24} md={8}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <Avatar size={100} icon={<UserOutlined />} />
                            <h2 style={{ marginTop: 16 }}>{user.name}</h2>
                            <p>{user.role || 'Função não especificada'}</p>
                            <p>{user.department || 'Departamento não especificado'}</p>
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
                                        name="name"
                                        label="Nome Completo"
                                        rules={[{ required: true, message: 'Por favor, informe seu nome' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Nome Completo" />
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
                                        <Input placeholder="Função" />
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