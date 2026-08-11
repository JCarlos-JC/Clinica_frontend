import React, { createContext, useEffect, useState, useMemo } from 'react';

export const ClinicContext = createContext();

export const ClinicProvider = ({ children }) => {
    // Função para normalizar exames (garantir que sejam sempre strings ou objetos processados)
    const normalizarExames = (exames) => {
      if (!exames) return [];
      
      if (!Array.isArray(exames)) {
        // Se for uma string simples
        if (typeof exames === 'string') return [exames];
        // Se for um objeto
        if (typeof exames === 'object' && exames !== null) {
          if (exames.nome) return [String(exames.nome)];
          return [JSON.stringify(exames)];
        }
        return [String(exames)];
      }
      
      // Se for array, garantir que cada item seja string
      return exames.map(exame => {
        if (typeof exame === 'string') return exame;
        if (typeof exame === 'object' && exame !== null) {
          if (exame.nome) return String(exame.nome);
          return JSON.stringify(exame);
        }
        return String(exame);
      });
    };

    const getStoredUser = () => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    };

    const storedUser = getStoredUser();
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('access_token') || localStorage.getItem('token')) && Boolean(storedUser));
    const [user, setUser] = useState(storedUser || {
        name: '',
        email: '',
        role: '',
        department: ''
    });


    const [pacientes, setPacientes] = useState([]);
    const [triagensPendentes, setTriagensPendentes] = useState([]);
    const [triagensRealizadas, setTriagensRealizadas] = useState([]);
    const [consultasPendentes, setConsultasPendentes] = useState([]);
    const [consultasRealizadas, setConsultasRealizadas] = useState([]);
    const [examesPendentes, setExamesPendentes] = useState([]);
    const [examesConcluidos, setExamesConcluidos] = useState([]);
    // Novo estado para pacientes transferidos para especialidades
    const [pacientesTransferidosEspecialidade, setPacientesTransferidosEspecialidade] = useState([]);
    // Estado para prescrições médicas
    const [prescricoes, setPrescricoes] = useState([]);
    // Estado para Utentes Autônomos
    const [utentesAutonomos, setUtentesAutonomos] = useState([]);

    useEffect(() => {
        const syncAuthFromStorage = () => {
            const nextUser = getStoredUser();
            const hasToken = Boolean(localStorage.getItem('access_token') || localStorage.getItem('token'));
            setIsAuthenticated(hasToken && Boolean(nextUser));
            if (nextUser) {
                setUser(nextUser);
            }
        };

        const handleAuthExpired = () => {
            setIsAuthenticated(false);
            setUser({
                name: '',
                email: '',
                role: '',
                department: ''
            });
        };

        window.addEventListener('storage', syncAuthFromStorage);
        window.addEventListener('auth:login', syncAuthFromStorage);
        window.addEventListener('auth:expired', handleAuthExpired);

        return () => {
            window.removeEventListener('storage', syncAuthFromStorage);
            window.removeEventListener('auth:login', syncAuthFromStorage);
            window.removeEventListener('auth:expired', handleAuthExpired);
        };
    }, []);

    // Funções de login/logout
    const login = (username, password) => {
        // Define user credentials with different roles
        const users = [
            { username: 'admin', password: 'admin', role: 'admin', name: 'Administrador', department: 'TI', especialidade: null },
            { username: 'aceitacao', password: 'aceitacao', role: 'aceitacao', name: 'Recepcionista', department: 'Aceitação', especialidade: null },
            { username: 'enfermeiro', password: 'enfermeiro', role: 'enfermeiro', name: 'Enfermeiro', department: 'Enfermaria', especialidade: null },
            { username: 'analista', password: 'analista', role: 'analista', name: 'Analista', department: 'Laboratório', especialidade: null },
            // Médicos com especialidades específicas
            { username: 'dra.ana', password: 'medico123', role: 'medico', name: 'Dr. Ana Cardoso', department: 'Consultório', especialidade: 'Clínico Geral', medicoId: 1 },
            { username: 'dr.joao', password: 'medico123', role: 'medico', name: 'Dr. João Silva', department: 'Consultório', especialidade: 'Pediatria', medicoId: 2 },
            { username: 'dra.maria', password: 'medico123', role: 'medico', name: 'Dra. Maria Santos', department: 'Consultório', especialidade: 'Ginecologia', medicoId: 3 },
            { username: 'dr.carlos', password: 'medico123', role: 'medico', name: 'Dr. Carlos Lima', department: 'Consultório', especialidade: 'Ortopedia', medicoId: 4 },
            { username: 'dra.paula', password: 'medico123', role: 'medico', name: 'Dra. Paula Rocha', department: 'Consultório', especialidade: 'Clínico Geral', medicoId: 5 },
            { username: 'dr.pedro', password: 'medico123', role: 'medico', name: 'Dr. Pedro Alves', department: 'Consultório', especialidade: 'Cardiologia', medicoId: 6 },
            // Médico geral (pode ver todos os pacientes)
            { username: 'medico', password: 'medico', role: 'medico', name: 'Médico Geral', department: 'Consultório', especialidade: null, medicoId: null }
        ];

        const foundUser = users.find(user => user.username === username && user.password === password);

        if (foundUser) {
            setIsAuthenticated(true);
            setUser({
                name: foundUser.name,
                email: `${foundUser.username}@clinica.uem.mz`,
                role: foundUser.role,
                department: foundUser.department,
                especialidade: foundUser.especialidade,
                medicoId: foundUser.medicoId
            });
            return true;
        }
        return false;
    };

    const updateUserProfile = async (userData) => {
        try {
            // Aqui você deve implementar a chamada à API para atualizar os dados do usuário
            // Por exemplo:
            // const response = await api.put('/users/profile', userData);

            // Após atualizar com sucesso, atualize o estado do usuário
            setUser(prevUser => ({
                ...prevUser,
                ...userData
            }));

            return true;
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }; const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser({
            name: '',
            email: '',
            role: '',
            department: ''
        });
    };

    // Helper function to check if user has access to a specific route
    const checkAccess = (requiredRole) => {
        if (!isAuthenticated) return false;
        if (user.role === 'admin') return true; // Admin has access to everything
        return user.role === requiredRole;
    };

    // Médicos de exemplo para seleção de consulta
    const medicos = [
        { id: 1, nome: 'Dr. Ana Cardoso', especialidade: 'Clínico Geral' },
        { id: 2, nome: 'Dr. João Silva', especialidade: 'Pediatria' },
        { id: 3, nome: 'Dra. Maria Santos', especialidade: 'Ginecologia' },
        { id: 4, nome: 'Dr. Carlos Lima', especialidade: 'Ortopedia' },
        { id: 5, nome: 'Dra. Paula Rocha', especialidade: 'Clínico Geral' },
        { id: 6, nome: 'Dr. Pedro Alves', especialidade: 'Cardiologia' },
    ];

    // Função utilitária para buscar médicos por especialidade
    const getMedicosPorEspecialidade = (especialidade) =>
        medicos.filter(m => m.especialidade === especialidade);    // Função para adicionar/atualizar utente autônomo
    const adicionarUtenteAutonomo = (utente) => {
        const novoUtente = {
            ...utente,
            id: utente.id || Date.now().toString(),
            dataCadastro: new Date()
        };

        setUtentesAutonomos(prev => [...prev, novoUtente]);
        return novoUtente;
    };

    // Função para atualizar utente autônomo existente
    const atualizarUtenteAutonomo = (utente) => {

        setUtentesAutonomos(prev => {
            
            const novaLista = prev.map(u => {
                // Usar NID como identificador principal para utentes autônomos
                const matchByNid = u.nid && utente.nid && u.nid === utente.nid;
                const matchById = u.id === utente.id; // Fallback para compatibilidade
                
                if (matchByNid || (!u.nid && matchById)) {
                    
                    // Forçar override completo dos campos de reset
                    const utenteAtualizado = {
                        ...u,
                        ...utente,
                        // Garantir que os campos de reset são realmente null
                        examesSolicitados: utente.examesSolicitados === null ? null : 
                            (Array.isArray(utente.examesSolicitados) ? 
                                utente.examesSolicitados.map(exame => typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)) : 
                                typeof utente.examesSolicitados === 'object' ? 
                                    (utente.examesSolicitados.nome || JSON.stringify(utente.examesSolicitados)) : 
                                    String(utente.examesSolicitados)),
                        status: utente.status === null ? null : utente.status,
                        statusPagamento: utente.statusPagamento === null ? null : utente.statusPagamento
                    };
                    
                    return utenteAtualizado;
                }
                return u;
            });
            return novaLista;
        });
        return utente;
    };

    // Função para adicionar exame de um utente autônomo aos exames pendentes
    // Função para adicionar uma prescrição
    const adicionarPrescricao = (prescricao) => {
        console.log('Adicionando prescrição ao contexto:', prescricao);
        
        // Garantir que temos o ID e o NID do paciente
        if (!prescricao.pacienteNid && prescricao.pacienteId) {
            console.warn('Prescrição sem NID do paciente. Tentando encontrar paciente para obter NID...');
            
            // Tentar encontrar o paciente nas consultas pendentes ou realizadas
            const pacienteEncontrado = [...consultasPendentes, ...consultasRealizadas]
                .find(p => p.id === prescricao.pacienteId);
                
            if (pacienteEncontrado && pacienteEncontrado.nid) {
                console.log('NID do paciente encontrado:', pacienteEncontrado.nid);
                prescricao.pacienteNid = pacienteEncontrado.nid;
            } else {
                console.warn('Não foi possível encontrar o NID do paciente');
            }
        }
        
        const novaPrescricao = {
            ...prescricao,
            id: prescricao.id || Date.now(),
            dataCriacao: prescricao.dataCriacao || new Date().toLocaleString(),
            status: prescricao.status || 'ativa'
        };
        
        setPrescricoes(prev => {
            console.log('Total de prescrições antes de adicionar:', prev.length);
            return [...prev, novaPrescricao];
        });
        
        console.log('Prescrição adicionada com sucesso:', novaPrescricao);
        return novaPrescricao;
    };
    
    // Função para atualizar uma prescrição existente
    const atualizarPrescricao = (id, novosDados) => {
        console.log('Atualizando prescrição:', { id, novosDados });
        
        // Garantir que o NID do paciente seja mantido
        if (!novosDados.pacienteNid && novosDados.pacienteId) {
            console.warn('Prescrição sem NID do paciente na atualização. Tentando encontrar...');
            
            // Verificar se a prescrição original tem o NID
            const prescricaoOriginal = prescricoes.find(p => p.id === id);
            if (prescricaoOriginal && prescricaoOriginal.pacienteNid) {
                console.log('NID encontrado na prescrição original:', prescricaoOriginal.pacienteNid);
                novosDados.pacienteNid = prescricaoOriginal.pacienteNid;
            } else {
                // Tentar encontrar o paciente nas consultas
                const pacienteEncontrado = [...consultasPendentes, ...consultasRealizadas]
                    .find(p => p.id === novosDados.pacienteId);
                    
                if (pacienteEncontrado && pacienteEncontrado.nid) {
                    console.log('NID do paciente encontrado nas consultas:', pacienteEncontrado.nid);
                    novosDados.pacienteNid = pacienteEncontrado.nid;
                }
            }
        }
        
        setPrescricoes(prev => {
            const resultado = prev.map(p => {
                if (p.id === id) {
                    const prescricaoAtualizada = { 
                        ...p, 
                        ...novosDados, 
                        dataAtualizacao: new Date().toLocaleString() 
                    };
                    console.log('Prescrição atualizada:', prescricaoAtualizada);
                    return prescricaoAtualizada;
                }
                return p;
            });
            
            console.log(`Atualização concluída. ${resultado.length} prescrições no total.`);
            return resultado;
        });
    };
    
    // Função para remover uma prescrição
    const removerPrescricao = (id) => {
        setPrescricoes(prev => prev.filter(p => p.id !== id));
    };
    
    // Função para obter prescrições de um paciente específico
    const getPrescricoesPorPaciente = (pacienteId, pacienteNid) => {
        console.log('Buscando prescrições para paciente:', { pacienteId, pacienteNid });
        console.log('Total de prescrições no contexto:', prescricoes.length);
        
        // Se temos o NID, tentamos usar ele também para encontrar todas as prescrições
        if (pacienteNid) {
            const result = prescricoes.filter(p => 
                p.pacienteId === pacienteId || 
                p.pacienteNid === pacienteNid
            );
            console.log(`Encontradas ${result.length} prescrições usando ID e NID`);
            return result;
        }
        
        // Se só temos o ID, tentamos encontrar pelo ID ou pelo NID armazenado como ID
        const result = prescricoes.filter(p => 
            p.pacienteId === pacienteId || 
            (p.pacienteNid && p.pacienteNid === pacienteId)
        );
        console.log(`Encontradas ${result.length} prescrições usando apenas ID`);
        return result;
    };

    const marcarExameUtenteAutonomo = (utente) => {
        // Mapear códigos dos exames para nomes mais descritivos
        const tiposExames = {
            'hemograma': 'Hemograma Completo',
            'glicemia': 'Glicemia',
            'colesterol': 'Perfil Lipídico',
            'urina': 'Exame de Urina',
            'fezes': 'Exame de Fezes',
            'hepatite': 'Marcadores de Hepatite',
            'hiv': 'Teste de HIV',
            'pcr': 'PCR',
            'ureia': 'Ureia e Creatinina',
            'tsh': 'TSH e Hormônios Tireoidianos'
        };

        const exameNome = tiposExames[utente.tipoExame] || utente.tipoExame;

        const exame = {
            id: Date.now(),
            pacienteId: utente.id,
            nome: utente.nome,
            apelido: utente.apelido,
            dataNascimento: utente.dataNascimento,
            bilheteIdentidade: utente.bilheteIdentidade,
            hospitalProveniencia: utente.hospitalProveniencia,
            examesSolicitados: exameNome, // String única normalizada
            dataSolicitacao: new Date(),
            prioridade: 'Normal',
            solicitadoPor: 'Utente Autônomo',
            tipoUtente: 'autonomo'
        };

        setExamesPendentes(prev => [...prev, exame]);
        return exame;
    };

    // Otimizar o valor do contexto usando useMemo
    const contextValue = useMemo(() => ({
        pacientes,
        setPacientes,
        triagensPendentes,
        setTriagensPendentes,
        triagensRealizadas,
        setTriagensRealizadas,
        consultasPendentes, 
        setConsultasPendentes,
        consultasRealizadas,
        setConsultasRealizadas,
        examesPendentes,
        setExamesPendentes,
        examesConcluidos,
        setExamesConcluidos,
        pacientesTransferidosEspecialidade,
        setPacientesTransferidosEspecialidade,
        utentesAutonomos,
        setUtentesAutonomos,
        adicionarUtenteAutonomo,
        atualizarUtenteAutonomo,
        marcarExameUtenteAutonomo,
        prescricoes,
        setPrescricoes,
        adicionarPrescricao,
        atualizarPrescricao,
        removerPrescricao,
        getPrescricoesPorPaciente,
        isAuthenticated,
        user,
        login,
        logout,
        updateUserProfile,
        medicos,
        getMedicosPorEspecialidade,
        checkAccess,
    }), [
        pacientes,
        triagensPendentes,
        triagensRealizadas,
        consultasPendentes,
        consultasRealizadas,
        examesPendentes,
        examesConcluidos,
        pacientesTransferidosEspecialidade,
        utentesAutonomos,
        prescricoes,
        isAuthenticated,
        user,
        medicos
    ]);

    return (
        <ClinicContext.Provider value={contextValue}>
            {children}
        </ClinicContext.Provider>
    );
};