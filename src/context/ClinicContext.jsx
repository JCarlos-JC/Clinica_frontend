import React, { createContext, useState, useMemo } from 'react';

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

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState({
        name: '',
        email: '',
        role: '',
        department: ''
    });

    // Dados de teste para pacientes com datas de cadastro para hoje, ontem e dias anteriores
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);
    const doisDiasAtras = new Date();
    doisDiasAtras.setDate(hoje.getDate() - 2);

    // Dados de teste para utentes autônomos
    const utentesAutonomosTeste = [
        {
            id: "1001",
            nome: "Ana Maria",
            apelido: "Sousa",
            hospitalProveniencia: "Hospital Central de Maputo",
            dataNascimento: new Date(1992, 5, 20),
            genero: "feminino",
            tipoDocumento: "bi",
            bilheteIdentidade: "12345678A",
            celular: "842345678",
            celularalternativo: "",
            tipoExame: "hemograma",
            dataCadastro: hoje
        },
        {
            id: "1002",
            nome: "Manuel",
            apelido: "Tembe",
            hospitalProveniencia: "Clínica Privada",
            dataNascimento: new Date(1985, 10, 15),
            genero: "masculino",
            tipoDocumento: "passaporte",
            bilheteIdentidade: "MP567890",
            celular: "821234567",
            celularalternativo: "847654321",
            tipoExame: "glicemia",
            dataCadastro: ontem
        }
    ];

    const dadosDeTeste = [
        {
            id: 1,
            nid: '0001/2023',
            nome: 'João Silva',
            apelido: 'Silva',
            dataNascimento: new Date(1990, 5, 15),
            genero: 'Masculino',
            tipoUtente: 'estudanteBolseiro',
            celular: '82 123 4567',
            dataCadastro: hoje
        },
        {
            id: 2,
            nid: '0002/2023',
            nome: 'Maria Pereira',
            apelido: 'Pereira',
            dataNascimento: new Date(1985, 2, 10),
            genero: 'Feminino',
            tipoUtente: 'docente',
            celular: '84 234 5678',
            dataCadastro: hoje
        },
        {
            id: 3,
            nid: '0003/2023',
            nome: 'Carlos Oliveira',
            apelido: 'Oliveira',
            dataNascimento: new Date(2000, 11, 21),
            genero: 'Masculino',
            tipoUtente: 'estudanteNaoBolseiro',
            celular: '83 345 6789',
            dataCadastro: ontem
        },
        {
            id: 4,
            nid: '0004/2023',
            nome: 'Ana Santos',
            apelido: 'Santos',
            dataNascimento: new Date(1995, 7, 3),
            genero: 'Feminino',
            tipoUtente: 'funcionario',
            celular: '82 456 7890',
            dataCadastro: ontem
        },
        {
            id: 5,
            nid: '0005/2023',
            nome: 'Pedro Machado',
            apelido: 'Machado',
            dataNascimento: new Date(1988, 4, 18),
            genero: 'Masculino',
            tipoUtente: 'comunidade',
            celular: '84 567 8901',
            dataCadastro: doisDiasAtras
        }
    ];

    // Dados de teste para triagens pendentes - removidos para evitar conflitos
    const triagensPendentesTeste = [];    // Dados de teste para triagens realizadas
    const triagensRealizadasTeste = [
        {
            id: 201,
            pacienteId: 2,
            dataTriagem: hoje,
            tipoTriagem: 'vital',
            peso: 65,
            altura: 1.68,
            pressaoArterial: '120/80',
            frequenciaCardiaca: 72,
            temperatura: 37.2,
            oximetria: 98,
            glicoseCapilar: 95,
            observacoes: 'Paciente sem queixas específicas',
            nome: 'Maria Pereira',
            nid: '0002/2023',
            apelido: 'Pereira',
            genero: 'Feminino',
            dataNascimento: new Date(1985, 2, 10),
            tipoUtente: 'docente',
            celular: '84 234 5678'
        },
        {
            id: 202,
            pacienteId: 4,
            dataTriagem: ontem,
            tipoTriagem: 'vital',
            peso: 58,
            altura: 1.62,
            pressaoArterial: '130/85',
            frequenciaCardiaca: 78,
            temperatura: 36.8,
            oximetria: 97,
            glicoseCapilar: 102,
            observacoes: 'Leve dor de cabeça',
            nome: 'Ana Santos',
            nid: '0004/2023',
            apelido: 'Santos',
            genero: 'Feminino',
            dataNascimento: new Date(1995, 7, 3),
            tipoUtente: 'funcionario',
            celular: '82 456 7890'
        },
        {
            id: 205,
            pacienteId: 1,
            dataTriagem: hoje,
            tipoTriagem: 'vital',
            peso: 78,
            altura: 1.75,
            pressaoArterial: '135/85',
            frequenciaCardiaca: 75,
            temperatura: 36.9,
            oximetria: 99,
            glicoseCapilar: 88,
            observacoes: 'Paciente relata dores musculares',
            nome: 'João Silva',
            nid: '0001/2023',
            apelido: 'Silva',
            genero: 'Masculino',
            dataNascimento: new Date(1990, 5, 15),
            tipoUtente: 'estudanteBolseiro',
            celular: '82 123 4567'
        },
        {
            id: 203,
            pacienteId: 1,
            dataTriagem: doisDiasAtras,
            tipoTriagem: 'exames',
            dataExames: doisDiasAtras,
            resultadosExames: {
                'Hemograma': 'Normal',
                'Glicemia em jejum': '110 mg/dL (Limítrofe)',
                'Colesterol Total': '205 mg/dL (Levemente elevado)'
            },
            observacoes: 'Recomenda-se dieta equilibrada',
            jaConsultado: true,
            nome: 'João Silva',
            nid: '0001/2023',
            apelido: 'Silva',
            genero: 'Masculino',
            dataNascimento: new Date(1990, 5, 15),
            tipoUtente: 'estudanteBolseiro',
            celular: '82 123 4567'
        },
        {
            id: 204,
            pacienteId: 3,
            dataTriagem: doisDiasAtras,
            tipoTriagem: 'exames',
            dataExames: doisDiasAtras,
            resultadosExames: {
                'Raio-X Tórax': 'Sem alterações',
                'Eletrocardiograma': 'Ritmo sinusal normal'
            },
            observacoes: 'Resultados dentro da normalidade',
            jaConsultado: true,
            nome: 'Carlos Oliveira',
            nid: '0003/2023',
            apelido: 'Oliveira',
            genero: 'Masculino',
            dataNascimento: new Date(2000, 11, 21),
            tipoUtente: 'estudanteNaoBolseiro',
            celular: '83 345 6789'
        }
    ];// Dados de teste para consultas pendentes e realizadas
    const consultasPendentesTeste = [
        {
            id: 301,
            pacienteId: 2,
            dataConsulta: hoje,
            medicoId: 1,
            medicoNome: 'Dr. Ana Cardoso',
            especialidade: 'Clínico Geral',
            nome: 'Maria Pereira',
            nid: '0002/2023'
        },
        {
            id: 302,
            pacienteId: 4,
            dataConsulta: hoje,
            medicoId: 3,
            medicoNome: 'Dra. Maria Santos',
            especialidade: 'Ginecologia',
            nome: 'Ana Santos',
            nid: '0004/2023'
        }
    ];

    // Dados de teste para exames pendentes
    const examesPendentesTeste = [
        {
            id: 501,
            pacienteId: 1,
            examesSolicitados: 'Hemograma, Glicemia',
            dataSolicitacao: hoje,
            nome: 'João Silva',
            nid: '0001/2023',
            apelido: 'Silva',
            dataNascimento: new Date(1990, 5, 15),
        },
        {
            id: 502,
            pacienteId: 3,
            examesSolicitados: 'Raio-X Tórax, Eletrocardiograma',
            dataSolicitacao: ontem,
            nome: 'Carlos Oliveira',
            nid: '0003/2023',
            apelido: 'Oliveira',
            dataNascimento: new Date(2000, 11, 21),
        }
    ];    // Dados de teste para exames concluídos
    const examesConcluidosTeste = [
        {
            id: 601,
            pacienteId: 2,
            resultadosExames: {
                'Hemograma': 'Normal',
                'Glicemia': '85 mg/dL (Normal)',
                'Colesterol Total': '198 mg/dL (Normal)',
                'HDL': '45 mg/dL (Normal)',
                'LDL': '115 mg/dL (Normal)'
            },
            dataExames: ontem,
            tipoTriagem: 'exames',
            observacoes: 'Todos os resultados dentro da normalidade',
            nome: 'Maria Pereira',
            nid: '0002/2023',
            apelido: 'Pereira',
            genero: 'Feminino',
            dataNascimento: new Date(1985, 2, 10),
            tipoUtente: 'docente',
            celular: '84 234 5678'
        },
        {
            id: 602,
            pacienteId: 4,
            resultadosExames: {
                'Ultrassonografia Abdominal': 'Sem alterações significativas',
                'Colesterol Total': '190 mg/dL (Normal)',
                'Raio-X Tórax': 'Sem alterações',
                'Mamografia': 'Sem indícios de nódulos ou alterações'
            },
            dataExames: doisDiasAtras,
            tipoTriagem: 'exames',
            observacoes: 'Recomenda-se manter acompanhamento de rotina',
            nome: 'Ana Santos',
            nid: '0004/2023',
            apelido: 'Santos',
            genero: 'Feminino',
            dataNascimento: new Date(1995, 7, 3),
            tipoUtente: 'funcionario',
            celular: '82 456 7890'
        }
    ];

    // Dados de teste para consultas realizadas - removidos para evitar conflitos de ciclo
    const consultasRealizadasTeste = [];

    const [pacientes, setPacientes] = useState(dadosDeTeste);
    const [triagensPendentes, setTriagensPendentes] = useState(triagensPendentesTeste);
    const [triagensRealizadas, setTriagensRealizadas] = useState(triagensRealizadasTeste);
    const [consultasPendentes, setConsultasPendentes] = useState(consultasPendentesTeste);
    const [consultasRealizadas, setConsultasRealizadas] = useState(consultasRealizadasTeste);
    const [examesPendentes, setExamesPendentes] = useState(examesPendentesTeste);
    const [examesConcluidos, setExamesConcluidos] = useState(examesConcluidosTeste);
    // Novo estado para pacientes transferidos para especialidades
    const [pacientesTransferidosEspecialidade, setPacientesTransferidosEspecialidade] = useState([]);
    // Estado para prescrições médicas
    const [prescricoes, setPrescricoes] = useState([]);
    // Estado para Utentes Autônomos
    const [utentesAutonomos, setUtentesAutonomos] = useState(utentesAutonomosTeste);

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