import axios from 'axios';

const API_URL = process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:8001/api';

class AuthService {
    /**
     * Login user
     */
    async login(email, password) {
        try {
            console.log('📤 Enviando requisição de login...'); // DEBUG

            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            });

            console.log('📥 Resposta do servidor:', response.data); // DEBUG

            // ✅ Nova estrutura: access_token, token_type, user
            if (response.data.access_token && response.data.user) {
                const token = response.data.access_token;
                const user = response.data.user;

                console.log('🔍 User recebido do backend:', user); // DEBUG
                console.log('🔍 Token recebido:', token); // DEBUG

                // ✅ BUSCAR ROLES DO USUÁRIO VIA API
                let userRoles = [];

                console.log('🔄 Tentando buscar roles do usuário...'); // DEBUG
                console.log('🔄 URL da requisição:', `${API_URL}/users/${user.id}/roles`); // DEBUG

                try {
                    const rolesResponse = await axios.get(`${API_URL}/users/${user.id}/roles`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('📥 Roles response STATUS:', rolesResponse.status); // DEBUG
                    console.log('📥 Roles response HEADERS:', rolesResponse.headers); // DEBUG
                    console.log('📥 Roles response DATA completa:', rolesResponse.data); // DEBUG
                    console.log('📥 Roles response DATA.roles:', rolesResponse.data.roles); // DEBUG

                    // ✅ ESTRUTURA CORRETA: { user_id, nome, roles: [{id, nome, descricao}] }
                    if (rolesResponse.data && Array.isArray(rolesResponse.data.roles)) {
                        // Extrair nomes dos roles (usar 'nome' ao invés de 'name')
                        userRoles = rolesResponse.data.roles.map(role => {
                            console.log('🔍 Processando role:', role); // DEBUG
                            return role.nome;
                        });
                        console.log('✅ Roles extraídos:', userRoles); // DEBUG
                    } else {
                        console.log('⚠️ Estrutura de roles inesperada!'); // DEBUG
                        console.log('⚠️ rolesResponse.data:', rolesResponse.data); // DEBUG
                        console.log('⚠️ Array.isArray(rolesResponse.data.roles):', Array.isArray(rolesResponse.data.roles)); // DEBUG
                    }
                } catch (roleError) {
                    console.error('❌ ERRO ao buscar roles:'); // DEBUG
                    console.error('❌ roleError:', roleError); // DEBUG
                    console.error('❌ roleError.message:', roleError.message); // DEBUG
                    console.error('❌ roleError.response:', roleError.response); // DEBUG
                    console.error('❌ roleError.response?.status:', roleError.response?.status); // DEBUG
                    console.error('❌ roleError.response?.data:', roleError.response?.data); // DEBUG
                    console.error('❌ roleError.config:', roleError.config); // DEBUG

                    // Se der erro, tentar usar roles que vieram no user
                    if (user.roles && Array.isArray(user.roles)) {
                        console.log('⚠️ Usando roles do user original:', user.roles); // DEBUG
                        userRoles = user.roles;
                    }
                }

                console.log('🔍 Roles finais antes da normalização:', userRoles); // DEBUG

                // ✅ Determinar tipo_usuario baseado nos roles
                let tipo_usuario = 'user'; // Padrão

                if (userRoles.length > 0) {
                    // Normalizar nomes dos roles (case-insensitive)
                    const rolesNormalizados = userRoles.map(r => r.toLowerCase());

                    console.log('🔍 Roles normalizados:', rolesNormalizados); // DEBUG

                    // Prioridade: admin > medico > enfermeiro > recepcionista > laboratorista > farmaceutico
                    if (rolesNormalizados.includes('administrador') || rolesNormalizados.includes('admin')) {
                        tipo_usuario = 'admin';
                        console.log('✅ Detectado como ADMIN'); // DEBUG
                    } else if (rolesNormalizados.includes('médico') || rolesNormalizados.includes('medico')) {
                        tipo_usuario = 'medico';
                        console.log('✅ Detectado como MEDICO'); // DEBUG
                    } else if (rolesNormalizados.includes('enfermeiro')) {
                        tipo_usuario = 'enfermeiro';
                        console.log('✅ Detectado como ENFERMEIRO'); // DEBUG
                    } else if (rolesNormalizados.includes('recepcionista') || rolesNormalizados.includes('rececionista')) {
                        tipo_usuario = 'recepcionista';
                        console.log('✅ Detectado como RECEPCIONISTA'); // DEBUG
                    } else if (rolesNormalizados.includes('laboratorista') || rolesNormalizados.includes('analista')) {
                        tipo_usuario = 'laboratorista';
                        console.log('✅ Detectado como LABORATORISTA'); // DEBUG
                    } else if (rolesNormalizados.includes('farmacêutico') || rolesNormalizados.includes('farmaceutico')) {
                        tipo_usuario = 'farmaceutico';
                        console.log('✅ Detectado como FARMACEUTICO'); // DEBUG
                    } else {
                        // Usar primeiro role normalizado
                        tipo_usuario = userRoles[0].toLowerCase().replace('administrador', 'admin');
                        console.log('✅ Usando primeiro role como tipo_usuario:', tipo_usuario); // DEBUG
                    }
                } else {
                    console.log('⚠️ Nenhum role encontrado, usando padrão: user'); // DEBUG
                }

                // Normalizar estrutura do usuário
                const normalizedUser = {
                    id: user.id,
                    nome: user.nome,
                    apelido: user.apelido || '',
                    email: user.email,
                    tipo_usuario: tipo_usuario,
                    cargo: user.cargo || '',
                    especialidade: user.especialidade || null,
                    primeiro_acesso: user.primeiro_acesso || false,
                    permissoes: user.permissions || [],
                    roles: userRoles // Manter roles originais
                };

                console.log('✅ Usuário NORMALIZADO FINAL:', normalizedUser); // DEBUG
                console.log('✅ normalizedUser.tipo_usuario:', normalizedUser.tipo_usuario); // DEBUG
                console.log('✅ normalizedUser.roles:', normalizedUser.roles); // DEBUG
                console.log('✅ normalizedUser.roles.length:', normalizedUser.roles.length); // DEBUG
                console.log('✅ normalizedUser.roles[0]:', normalizedUser.roles[0]); // DEBUG
                console.log('✅ typeof normalizedUser.roles:', typeof normalizedUser.roles); // DEBUG
                console.log('✅ Array.isArray(normalizedUser.roles):', Array.isArray(normalizedUser.roles)); // DEBUG

                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(normalizedUser));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                // Verificar o que foi salvo IMEDIATAMENTE após salvar
                const savedUser = JSON.parse(localStorage.getItem('user'));
                console.log('💾 User SALVO no localStorage (verificação IMEDIATA):', savedUser); // DEBUG
                console.log('💾 savedUser.tipo_usuario:', savedUser.tipo_usuario); // DEBUG
                console.log('💾 savedUser.roles:', savedUser.roles); // DEBUG
                console.log('💾 typeof savedUser.roles:', typeof savedUser.roles); // DEBUG
                console.log('💾 Array.isArray(savedUser.roles):', Array.isArray(savedUser.roles)); // DEBUG
                console.log('💾 savedUser.roles.length:', savedUser.roles.length); // DEBUG

                return {
                    success: true,
                    data: {
                        token: token,
                        user: normalizedUser
                    },
                    message: 'Login realizado com sucesso!'
                };
            }

            // Estrutura antiga
            if (response.data.status === 'success') {
                const { token, user } = response.data.data;

                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            }

            console.error('❌ Estrutura de resposta não reconhecida:', response.data);

            return {
                success: false,
                message: response.data.message || 'Erro ao realizar login'
            };

        } catch (error) {
            console.error('❌ Erro na requisição de login:', error);
            console.error('❌ Resposta do erro:', error.response?.data);

            return {
                success: false,
                message: error.response?.data?.message || 'Usuário ou senha inválidos!'
            };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            const token = localStorage.getItem('token');

            if (token) {
                await axios.post(`${API_URL}/auth/logout`, {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
        }

        return { success: true };
    }

    /**
     * Get current user with fresh data from API
     */
    async getCurrentUser() {
        try {
            const token = localStorage.getItem('token');

            if (!token) return null;

            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const user = response.data.user || response.data.data;

            if (!user) return null;

            // Buscar roles do usuário
            let userRoles = [];
            try {
                const rolesResponse = await axios.get(`${API_URL}/users/${user.id}/roles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // ✅ Estrutura correta: { user_id, nome, roles: [{id, nome, descricao}] }
                if (rolesResponse.data && Array.isArray(rolesResponse.data.roles)) {
                    userRoles = rolesResponse.data.roles.map(role => role.nome);
                }
            } catch (roleError) {
                console.error('Erro ao buscar roles:', roleError);
                if (user.roles && Array.isArray(user.roles)) {
                    userRoles = user.roles;
                }
            }

            // Determinar tipo_usuario
            let tipo_usuario = 'user';
            if (userRoles.length > 0) {
                const rolesNormalizados = userRoles.map(r => r.toLowerCase());

                if (rolesNormalizados.includes('administrador') || rolesNormalizados.includes('admin')) {
                    tipo_usuario = 'admin';
                } else if (rolesNormalizados.includes('médico') || rolesNormalizados.includes('medico')) {
                    tipo_usuario = 'medico';
                } else if (rolesNormalizados.includes('enfermeiro')) {
                    tipo_usuario = 'enfermeiro';
                } else if (rolesNormalizados.includes('recepcionista') || rolesNormalizados.includes('rececionista')) {
                    tipo_usuario = 'recepcionista';
                } else if (rolesNormalizados.includes('laboratorista') || rolesNormalizados.includes('analista')) {
                    tipo_usuario = 'laboratorista';
                } else if (rolesNormalizados.includes('farmacêutico') || rolesNormalizados.includes('farmaceutico')) {
                    tipo_usuario = 'farmaceutico';
                } else {
                    tipo_usuario = userRoles[0].toLowerCase().replace('administrador', 'admin');
                }
            }

            const normalizedUser = {
                id: user.id,
                nome: user.nome,
                apelido: user.apelido || '',
                email: user.email,
                tipo_usuario: tipo_usuario,
                cargo: user.cargo || '',
                especialidade: user.especialidade || null,
                primeiro_acesso: user.primeiro_acesso || false,
                permissoes: user.permissions || [],
                roles: userRoles
            };

            localStorage.setItem('user', JSON.stringify(normalizedUser));
            return normalizedUser;

        } catch (error) {
            console.error('Get current user error:', error);

            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }

            return null;
        }
    }

    /**
     * Get user roles from API
     */
    async getUserRoles(userId) {
        try {
            const token = localStorage.getItem('token');

            if (!token) return [];

            const response = await axios.get(`${API_URL}/users/${userId}/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // ✅ Estrutura correta: { user_id, nome, roles: [{id, nome, descricao}] }
            if (response.data && Array.isArray(response.data.roles)) {
                return response.data.roles.map(role => role.nome);
            }

            return [];

        } catch (error) {
            console.error('Get user roles error:', error);
            return [];
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword, newPasswordConfirmation) {
        try {
            const token = localStorage.getItem('token');

            const response = await axios.post(`${API_URL}/auth/change-password`, {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirmation
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            return {
                success: response.data.status === 'success' || response.status === 200,
                message: response.data.message || 'Senha alterada com sucesso'
            };

        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao alterar senha'
            };
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = localStorage.getItem('token');
        return !!token;
    }

    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Get stored user
     */
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        const user = this.getUser();
        if (!user || !user.permissoes) return false;

        if (user.permissoes.includes('*')) return true;

        return user.permissoes.includes(permission);
    }

    /**
     * Get user type
     */
    getUserType() {
        const user = this.getUser();
        return user?.tipo_usuario || null;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        const user = this.getUser();
        const isAdminByTipo = user?.tipo_usuario === 'admin';
        const isAdminByRole = user?.roles?.some(r =>
            r.toLowerCase() === 'admin' ||
            r.toLowerCase() === 'administrador'
        );
        return isAdminByTipo || isAdminByRole;
    }

    /**
     * Check if user is doctor
     */
    isMedico() {
        const user = this.getUser();
        return user?.tipo_usuario === 'medico' || user?.roles?.some(r =>
            r.toLowerCase() === 'medico' ||
            r.toLowerCase() === 'médico'
        );
    }

    /**
     * Check if user is nurse
     */
    isEnfermeiro() {
        const user = this.getUser();
        return user?.tipo_usuario === 'enfermeiro' || user?.roles?.some(r =>
            r.toLowerCase() === 'enfermeiro'
        );
    }

    /**
     * Check if user is receptionist
     */
    isRecepcionista() {
        const user = this.getUser();
        return user?.tipo_usuario === 'recepcionista' || user?.roles?.some(r =>
            r.toLowerCase() === 'recepcionista' ||
            r.toLowerCase() === 'rececionista'
        );
    }

    /**
     * Check if user is lab technician
     */
    isLaboratorista() {
        const user = this.getUser();
        return user?.tipo_usuario === 'laboratorista' || user?.roles?.some(r =>
            r.toLowerCase() === 'laboratorista' ||
            r.toLowerCase() === 'analista'
        );
    }

    /**
     * Check if user is pharmacist
     */
    isFarmaceutico() {
        const user = this.getUser();
        return user?.tipo_usuario === 'farmaceutico' || user?.roles?.some(r =>
            r.toLowerCase() === 'farmaceutico' ||
            r.toLowerCase() === 'farmacêutico'
        );
    }
}

// Criar instância e atribuir a uma variável antes de exportar
const authServiceInstance = new AuthService();

export default authServiceInstance;