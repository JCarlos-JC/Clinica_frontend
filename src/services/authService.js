import axios from 'axios';
import { clearAuthStorage } from './apiConfig';

const API_URL = (process.env.REACT_APP_API_URL || 'http://196.3.100.216/api').replace(/\/$/, '');

class AuthService {
    normalizeRoleName(role) {
        const raw = typeof role === 'string'
            ? role
            : (role?.nome || role?.name || role?.codigo || role?.slug || role?.role || '');

        return String(raw)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    extractRoleNames(source = {}) {
        if (Array.isArray(source)) {
            return this.extractRoleNames({ roles: source });
        }

        const roleSources = [
            source.roles,
            source.role,
            source.perfis,
            source.perfil,
            source.grupos,
            source.tipo_usuario,
            source.tipo,
            source.cargo
        ];

        const names = roleSources.flatMap((value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            return [value];
        }).map((role) => {
            if (typeof role === 'string') return role;
            return role?.nome || role?.name || role?.codigo || role?.slug || role?.role || '';
        }).filter(Boolean);

        const seen = new Set();
        return names.filter((name) => {
            const normalized = this.normalizeRoleName(name);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }

    inferUserType(user = {}, roles = []) {
        const normalizedRoles = roles.map(role => this.normalizeRoleName(role));
        const identityHints = [user.tipo_usuario, user.tipo, user.cargo, user.nome, user.name, user.email]
            .map(value => this.normalizeRoleName(value))
            .filter(Boolean);
        const haystack = [...normalizedRoles, ...identityHints];

        if (haystack.some(value => value.includes('administrador') || value === 'admin')) return 'admin';
        if (haystack.some(value => value.includes('medico'))) return 'medico';
        if (haystack.some(value => value.includes('enfermeiro'))) return 'enfermeiro';
        if (haystack.some(value => value.includes('recepcionista') || value.includes('rececionista'))) return 'recepcionista';
        if (haystack.some(value => value.includes('laboratorista') || value.includes('analista'))) return 'laboratorista';
        if (haystack.some(value => value.includes('farmaceutico'))) return 'farmaceutico';

        return normalizedRoles[0] || user.tipo_usuario || 'user';
    }

    normalizeUser(user = {}, explicitRoles = null) {
        const roles = explicitRoles && explicitRoles.length > 0
            ? explicitRoles
            : this.extractRoleNames(user);
        const tipo_usuario = this.inferUserType(user, roles);

        const normalizedRoles = roles.length > 0
            ? roles
            : (tipo_usuario === 'admin' ? ['admin'] : []);

        return {
            ...user,
            id: user.id,
            nome: user.nome || user.name || '',
            apelido: user.apelido || '',
            email: user.email || '',
            tipo_usuario,
            cargo: user.cargo || '',
            especialidade: user.especialidade || null,
            primeiro_acesso: user.primeiro_acesso || false,
            permissoes: user.permissions || user.permissoes || [],
            roles: normalizedRoles
        };
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            // ...existing code...

            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            });

            // ...existing code...

            // ✅ Nova estrutura: access_token, token_type, user
            if (response.data.access_token && response.data.user) {
                const token = response.data.access_token;
                const user = response.data.user;

                // ...existing code...

                // ✅ BUSCAR ROLES DO USUÁRIO VIA API
                let userRoles = [];

                // ...existing code...

                try {
                    const rolesResponse = await axios.get(`${API_URL}/users/${user.id}/roles`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        _skipAuthRedirect: true
                    });

                    // ...existing code...

                    // ✅ ESTRUTURA CORRETA: { user_id, nome, roles: [{id, nome, descricao}] }
                    userRoles = this.extractRoleNames(rolesResponse.data);
                    if (userRoles.length === 0) {
                        userRoles = this.extractRoleNames(user);
                    }
                } catch (roleError) {
                    // ...existing code...

                    // Se der erro, tentar usar roles que vieram no user
                    if (user.roles && Array.isArray(user.roles)) {
                        // ...existing code...
                        userRoles = this.extractRoleNames(user);
                    }
                }

                // ...existing code...

                const normalizedUser = this.normalizeUser(user, userRoles);

                // ...existing code...

                localStorage.setItem('token', token);
                localStorage.setItem('access_token', token);
                localStorage.setItem('user', JSON.stringify(normalizedUser));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                window.dispatchEvent(new CustomEvent('auth:login'));

                // ...existing code...

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
                localStorage.setItem('access_token', token);
                localStorage.setItem('user', JSON.stringify(user));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                window.dispatchEvent(new CustomEvent('auth:login'));

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            }

            // ...existing code...

            return {
                success: false,
                message: response.data.message || 'Erro ao realizar login'
            };

        } catch (error) {
            // ...existing code...

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
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            if (token) {
                await axios.post(`${API_URL}/auth/logout`, {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            // ...existing code...
        } finally {
            clearAuthStorage();
            delete axios.defaults.headers.common['Authorization'];
        }

        return { success: true };
    }

    /**
     * Get current user with fresh data from API
     */
    async getCurrentUser() {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

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
                    headers: { 'Authorization': `Bearer ${token}` },
                    _skipAuthRedirect: true
                });

                // ✅ Estrutura correta: { user_id, nome, roles: [{id, nome, descricao}] }
                userRoles = this.extractRoleNames(rolesResponse.data);
                if (userRoles.length === 0) {
                    userRoles = this.extractRoleNames(user);
                }
            } catch (roleError) {
                // ...existing code...
                if (user.roles && Array.isArray(user.roles)) {
                    userRoles = this.extractRoleNames(user);
                }
            }

            const normalizedUser = this.normalizeUser(user, userRoles);

            localStorage.setItem('user', JSON.stringify(normalizedUser));
            return normalizedUser;

        } catch (error) {
            // ...existing code...

            if (error.response?.status === 401) {
                clearAuthStorage();
            }

            return null;
        }
    }

    /**
     * Get user roles from API
     */
    async getUserRoles(userId) {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            if (!token) return [];

            const response = await axios.get(`${API_URL}/users/${userId}/roles`, {
                headers: { 'Authorization': `Bearer ${token}` },
                _skipAuthRedirect: true
            });

            return this.extractRoleNames(response.data);

        } catch (error) {
            // ...existing code...
            return [];
        }
    }

    /**
     * Update current user profile using the real users endpoint.
     */
    async updateCurrentUser(values = {}) {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            const currentUser = this.getUser();

            if (!token || !currentUser?.id) {
                return { success: false, message: 'Sessão inválida. Faça login novamente.' };
            }

            const payload = {
                nome: values.nome || values.name,
                apelido: values.apelido,
                email: values.email,
                telefone: values.telefone || values.phone,
                celular: values.celular || values.phone,
                cargo: values.cargo || values.role,
                departamento: values.departamento || values.department,
            };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
                    delete payload[key];
                }
            });

            const response = await axios.put(`${API_URL}/users/${currentUser.id}`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const user = response.data.user || response.data.data || response.data;
            const normalizedUser = this.normalizeUser({ ...currentUser, ...user });
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: normalizedUser }));

            return {
                success: true,
                data: normalizedUser,
                message: response.data.message || 'Perfil atualizado com sucesso'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao atualizar perfil'
            };
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword, newPasswordConfirmation) {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

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
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        return !!token;
    }

    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem('access_token') || localStorage.getItem('token');
    }

    /**
     * Get stored user
     */
    getUser() {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;

        try {
            const user = JSON.parse(userStr);
            const normalizedUser = this.normalizeUser(user);
            if (JSON.stringify(user) !== JSON.stringify(normalizedUser)) {
                localStorage.setItem('user', JSON.stringify(normalizedUser));
            }
            return normalizedUser;
        } catch (error) {
            clearAuthStorage();
            return null;
        }
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
            this.normalizeRoleName(r) === 'admin' ||
            this.normalizeRoleName(r) === 'administrador'
        );
        return isAdminByTipo || isAdminByRole;
    }

    /**
     * Check if user is doctor
     */
    isMedico() {
        const user = this.getUser();
        return user?.tipo_usuario === 'medico' || user?.roles?.some(r =>
            this.normalizeRoleName(r) === 'medico' ||
            this.normalizeRoleName(r) === 'médico'
        );
    }

    /**
     * Check if user is nurse
     */
    isEnfermeiro() {
        const user = this.getUser();
        return user?.tipo_usuario === 'enfermeiro' || user?.roles?.some(r =>
            this.normalizeRoleName(r) === 'enfermeiro'
        );
    }

    /**
     * Check if user is receptionist
     */
    isRecepcionista() {
        const user = this.getUser();
        return user?.tipo_usuario === 'recepcionista' || user?.roles?.some(r =>
            this.normalizeRoleName(r) === 'recepcionista' ||
            this.normalizeRoleName(r) === 'rececionista'
        );
    }

    /**
     * Check if user is lab technician
     */
    isLaboratorista() {
        const user = this.getUser();
        return user?.tipo_usuario === 'laboratorista' || user?.roles?.some(r =>
            this.normalizeRoleName(r) === 'laboratorista' ||
            this.normalizeRoleName(r) === 'analista'
        );
    }

    /**
     * Check if user is pharmacist
     */
    isFarmaceutico() {
        const user = this.getUser();
        return user?.tipo_usuario === 'farmaceutico' || user?.roles?.some(r =>
            this.normalizeRoleName(r) === 'farmaceutico' ||
            this.normalizeRoleName(r) === 'farmacêutico'
        );
    }
}

// Criar instância e atribuir a uma variável antes de exportar
const authServiceInstance = new AuthService();

export default authServiceInstance;
