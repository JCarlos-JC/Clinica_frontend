import React, { useState } from 'react';
import { Table, Button, Modal, Timeline, Input, Tabs, Card, Descriptions, Tag, Divider } from 'antd';
import {  FileSearchOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  HeartOutlined,
  FileTextOutlined,
  PrinterOutlined,
  StopOutlined,
  SendOutlined
} from '@ant-design/icons';
import useClinicalBackendData from '../../hooks/useClinicalBackendData';

const { TabPane } = Tabs;

const Arquivo = () => {
  // Função para formatar resultado de exame (similar ao ConsultaPaciente.jsx)
  const formatarResultadoExame = (valor) => {
    if (!valor) return '';
    
    if (typeof valor === 'string') {
      return valor;
    }
    
    if (typeof valor === 'object') {
      // Se tem a propriedade 'nome', usar ela
      if (valor.nome) {
        return valor.nome;
      }
      
      // Se tem 'valores', formatar os valores
      if (valor.valores && typeof valor.valores === 'object') {
        const valoresFormatados = Object.entries(valor.valores)
          .map(([nome, val]) => `${nome}: ${val}`)
          .join(' | ');
        
        // Se também tem arquivos, adicionar informação
        const arquivosInfo = valor.arquivos && Array.isArray(valor.arquivos) && valor.arquivos.length > 0 
          ? ` (${valor.arquivos.length} arquivo(s) anexo(s))`
          : '';
        
        return valoresFormatados + arquivosInfo;
      }
      
      // Se tem 'arquivos', mencionar os arquivos
      if (valor.arquivos && Array.isArray(valor.arquivos)) {
        const arquivosInfo = valor.arquivos.length > 0 
          ? ` (${valor.arquivos.length} arquivo(s) anexo(s))`
          : '';
        
        return `Resultados disponíveis${arquivosInfo}`;
      }
      
      // Para objetos complexos como {"Hemograma Completo":{"valores":{"Hemácias":"4",...}}}
      // Detectar se é um exame com estrutura aninhada
      const entries = Object.entries(valor);
      if (entries.length > 0) {
        return entries
          .filter(([key, val]) => val !== null && val !== undefined)
          .map(([nomeExame, dadosExame]) => {
            if (typeof dadosExame === 'object' && dadosExame !== null) {
              // Se tem a estrutura {valores: {...}, arquivos: [...]}
              if (dadosExame.valores && typeof dadosExame.valores === 'object') {
                const valoresFormatados = Object.entries(dadosExame.valores)
                  .map(([param, val]) => `${param}: ${val}`)
                  .join(', ');
                
                const arquivosInfo = dadosExame.arquivos && Array.isArray(dadosExame.arquivos) && dadosExame.arquivos.length > 0 
                  ? ` (${dadosExame.arquivos.length} arquivo(s))`
                  : '';
                
                return `${nomeExame}: ${valoresFormatados}${arquivosInfo}`;
              }
              
              // Se for um objeto simples, tentar extrair informações
              if (Object.keys(dadosExame).length <= 5) {
                const subValores = Object.entries(dadosExame)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ');
                return `${nomeExame}: ${subValores}`;
              }
              
              // Para objetos muito complexos
              return `${nomeExame}: [Dados detalhados disponíveis]`;
            }
            
            // Se não for objeto, usar valor direto
            return `${nomeExame}: ${dadosExame}`;
          })
          .join(' | ');
      }
    }
    
    return String(valor);
  };

  const {
    pacientes = [],
    triagensRealizadas = [],
    consultasRealizadas = [],
    examesConcluidos = [],
    loading,
  } = useClinicalBackendData();

  const [historicoVisivel, setHistoricoVisivel] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');

  const abrirHistorico = (paciente) => {
    setPacienteSelecionado(paciente);
    setHistoricoVisivel(true);
  };

  const fecharHistorico = () => {
    setHistoricoVisivel(false);
    setPacienteSelecionado(null);
  };

  const imprimirHistorico = () => {
    if (!pacienteSelecionado) return;

    const eventos = historicoPaciente();
    const content = `
      <html>
        <head>
          <title>Histórico Médico - ${pacienteSelecionado.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1, h2 { color: #1890ff; }
            .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
            .evento { margin-bottom: 20px; border: 1px solid #f0f0f0; padding: 15px; }
            .tipo { font-weight: bold; font-size: 18px; color: #1890ff; }
            .data { color: #666; }
            .descricao { white-space: pre-line; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Histórico Médico Completo</h1>
            <p><strong>Paciente:</strong> ${pacienteSelecionado.nome}</p>
            <p><strong>Documento:</strong> ${pacienteSelecionado.apelido}</p>
            <p><strong>Data Emissão:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${eventos.map(evento => `
            <div class="evento">
              <div class="tipo">${evento.tipo}</div>
              <div class="data">${evento.data}</div>
              <div class="descricao">${evento.descricao.replace(/\n/g, '<br>')}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const columnsPacientes = [
    { title: 'NID', dataIndex: 'nid', key: 'nid' },
    { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    {
      title: 'Idade',
      dataIndex: 'dataNascimento',
      key: 'idade',
      render: (text) => {
        if (!text) return 'N/A';
        const birthDate = text.isDayjs ? text.toDate() : new Date(text);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        return (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) ? age - 1 : age;
      },
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<FileSearchOutlined />}
          onClick={() => abrirHistorico(record)}
        >
          Ver Histórico Completo
        </Button>
      )
    }
  ];

  const pacientesFiltrados = pacientes.filter(p => {
    if (!p) return false;
    const termo = filtroNome.toLowerCase();
    const nomeCompleto = [p.nome, p.apelido, p.nid].filter(Boolean).join(' ').toLowerCase();
    return nomeCompleto.includes(termo);
  });
  const historicoPaciente = () => {
    if (!pacienteSelecionado) return [];

    const matchesPacienteSelecionado = (item = {}) => (
      String(item.pacienteId || item.paciente_id || '') === String(pacienteSelecionado.id) ||
      String(item.id || '') === String(pacienteSelecionado.id) ||
      (item.nid && pacienteSelecionado.nid && String(item.nid) === String(pacienteSelecionado.nid))
    );

    const triagensPaciente = triagensRealizadas.filter(matchesPacienteSelecionado);
    const consultasPaciente = consultasRealizadas.filter(matchesPacienteSelecionado);
    const examesPaciente = examesConcluidos.filter(matchesPacienteSelecionado);

    const eventos = [];

    // Adicionar triagens ao histórico
    triagensPaciente
      .filter(t => t.tipoTriagem !== 'exames') // Excluir exames, que serão processados separadamente
      .forEach(t => {
        eventos.push({
          tipo: 'Triagem',
          categoria: 'triagem',
          descricao: `
          Peso: ${t.peso || '-'}kg,
          Pressão Arterial: ${t.pressaoArterial || '-'},
          Frequência Cardíaca: ${t.frequenciaCardiaca || '-'} bpm,
          Oximetria: ${t.oximetria || '-'}%,
          Glicose Capilar: ${t.glicoseCapilar || '-'} mg/dL,
          Altura: ${t.altura || '-'} m,
          Temperatura: ${t.temperatura || '-'} °C,
          Observações: ${t.observacoes || 'Nenhuma'}
        `,
          data: t.dataTriagem,
          dadosCompletos: t
        });
      });

    // Adicionar consultas ao histórico
    consultasPaciente.forEach(c => {
      eventos.push({
        tipo: 'Consulta Médica',
        categoria: 'consulta',
        descricao: `
          Especialidade: ${c.especialidade || '-'},
          Médico: ${c.medico || '-'},
          Diagnóstico: ${c.diagnostico || '-'},
          Medicamentos: ${(c.medicamentos && c.medicamentos.length > 0) ? c.medicamentos.map(med => typeof med === 'object' ? (med.nome || med.medicamento || JSON.stringify(med)) : String(med)).join(', ') : 'Nenhum'},
          Exames Solicitados: ${(c.examesSolicitados && c.examesSolicitados.length > 0) ? c.examesSolicitados.map(exame => typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)).join(', ') : 'Nenhum'},
          Recomendações: ${c.recomendacoes || 'Nenhuma'},
          Observações: ${c.observacoes || 'Nenhuma'}
        `,
        data: c.dataConsulta,
        dadosCompletos: c
      });
    });

    // Adicionar exames ao histórico
    examesPaciente.forEach(e => {
      const resultados = e.resultadosExames ?
        formatarResultadoExame(e.resultadosExames) :
        'Nenhum resultado registrado';

      eventos.push({
        tipo: 'Exames Laboratoriais',
        categoria: 'exame',
        descricao: `
          Exame: ${e.nome_exame || e.tipo_exame || e.examesSolicitados || '-'}
          Resultados: ${resultados}
          Observações: ${e.observacoes || e.observacoes_resultado || 'Nenhuma'}
        `,
        data: e.dataExames,
        dadosCompletos: e
      });
    });

    // Ordenar eventos pela data (mais recentes primeiro)
    return eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
  };

  const renderTriagem = (triagem) => (
    <Descriptions bordered column={1} size="small">
      {triagem.peso && <Descriptions.Item label="Peso">{triagem.peso} kg</Descriptions.Item>}
      {triagem.altura && <Descriptions.Item label="Altura">{triagem.altura} m</Descriptions.Item>}
      {triagem.pressaoArterial && <Descriptions.Item label="Pressão Arterial">{triagem.pressaoArterial}</Descriptions.Item>}
      {triagem.frequenciaCardiaca && <Descriptions.Item label="Frequência Cardíaca">{triagem.frequenciaCardiaca} bpm</Descriptions.Item>}
      {triagem.temperatura && <Descriptions.Item label="Temperatura">{triagem.temperatura} °C</Descriptions.Item>}
      {triagem.oximetria && <Descriptions.Item label="Oximetria">{triagem.oximetria}%</Descriptions.Item>}
      {triagem.glicoseCapilar && <Descriptions.Item label="Glicose Capilar">{triagem.glicoseCapilar} mg/dL</Descriptions.Item>}
      {triagem.observacoes && <Descriptions.Item label="Observações">{triagem.observacoes}</Descriptions.Item>}
    </Descriptions>
  );  const renderConsulta = (consulta) => (
    <Descriptions bordered column={1} size="small">
      {consulta.especialidade && <Descriptions.Item label="Especialidade">{consulta.especialidade}</Descriptions.Item>}
      {consulta.medico && <Descriptions.Item label="Médico">{consulta.medico}</Descriptions.Item>}
      {consulta.diagnostico && <Descriptions.Item label="Diagnóstico">{consulta.diagnostico}</Descriptions.Item>}
      {consulta.status === 'obito' && (
        <>
          <Descriptions.Item label="Status" labelStyle={{ fontWeight: 'bold', color: '#ff4d4f' }}>
            <Tag color="red" style={{ fontSize: '14px', padding: '2px 8px' }}>Óbito</Tag>
          </Descriptions.Item>
          {consulta.causaMorte && (
            <Descriptions.Item label="Causa da Morte" labelStyle={{ fontWeight: 'bold' }}>
              <div style={{ color: '#ff4d4f' }}>{consulta.causaMorte}</div>
            </Descriptions.Item>
          )}
          {consulta.dataObito && (
            <Descriptions.Item label="Data do Óbito" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.dataObito}{consulta.horaObito ? ` às ${consulta.horaObito}` : ''}</div>
            </Descriptions.Item>
          )}
          {consulta.observacoesObito && (
            <Descriptions.Item label="Observações do Óbito" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.observacoesObito}</div>
            </Descriptions.Item>
          )}
        </>
      )}
      {consulta.status === 'transferido' && (
        <>
          <Descriptions.Item label="Status" labelStyle={{ fontWeight: 'bold', color: '#722ed1' }}>
            <Tag color="purple" style={{ fontSize: '14px', padding: '2px 8px' }}>Transferido</Tag>
          </Descriptions.Item>
          {consulta.hospitalDestino && (
            <Descriptions.Item label="Hospital de Destino" labelStyle={{ fontWeight: 'bold' }}>
              <div style={{ color: '#722ed1' }}>{consulta.hospitalDestino}</div>
            </Descriptions.Item>
          )}
          {consulta.motivoTransferencia && (
            <Descriptions.Item label="Motivo da Transferência" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.motivoTransferencia}</div>
            </Descriptions.Item>
          )}
          {consulta.dataTransferencia && (
            <Descriptions.Item label="Data da Transferência" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.dataTransferencia}</div>
            </Descriptions.Item>
          )}
          {consulta.observacoesTransferencia && (
            <Descriptions.Item label="Observações da Transferência" labelStyle={{ fontWeight: 'bold' }}>
              <div>{consulta.observacoesTransferencia}</div>
            </Descriptions.Item>
          )}
        </>
      )}
      {consulta.medicamentos && consulta.medicamentos.length > 0 && (
        <Descriptions.Item label="Medicamentos">
          <ul>
            {consulta.medicamentos.map((med, idx) => (
              <li key={idx}>{med}</li>
            ))}
          </ul>
        </Descriptions.Item>
      )}
      {consulta.examesSolicitados && consulta.examesSolicitados.length > 0 && (
        <Descriptions.Item label="Exames Solicitados">
          <ul>
            {consulta.examesSolicitados.map((exame, idx) => (
              <li key={idx}>{typeof exame === 'object' ? (exame.nome || JSON.stringify(exame)) : String(exame)}</li>
            ))}
          </ul>
        </Descriptions.Item>
      )}
      {consulta.recomendacoes && <Descriptions.Item label="Recomendações">{consulta.recomendacoes}</Descriptions.Item>}
      {consulta.observacoes && <Descriptions.Item label="Observações">{consulta.observacoes}</Descriptions.Item>}
    </Descriptions>
  );

  const renderExame = (exame) => (
    <Descriptions bordered column={1} size="small">
      {exame.resultadosExames && (
        <Descriptions.Item label="Resultados">
          <div style={{ whiteSpace: 'pre-line' }}>
            {formatarResultadoExame(exame.resultadosExames)}
          </div>
        </Descriptions.Item>
      )}
      {exame.observacoes && <Descriptions.Item label="Observações">{exame.observacoes}</Descriptions.Item>}
    </Descriptions>
  );

  const renderHistoricoTimeline = () => {
    const eventos = historicoPaciente();

    if (eventos.length === 0) {
      return <p>Não há histórico disponível para este paciente.</p>;
    }

    return (
      <Timeline mode="left">
        {eventos.map((item, index) => {
          let color;
          let icon;          switch (item.categoria) {
            case 'triagem':
              color = 'blue';
              icon = <HeartOutlined />;
              break;
            case 'consulta':
              // Check if this is an óbito record or transferência record
              if (item.dadosCompletos && item.dadosCompletos.status === 'obito') {
                color = 'red';
                icon = <StopOutlined />;
              } else if (item.dadosCompletos && item.dadosCompletos.status === 'transferido') {
                color = 'purple';
                icon = <SendOutlined />;
              } else {
                color = 'green';
                icon = <MedicineBoxOutlined />;
              }
              break;
            case 'exame':
              color = 'purple';
              icon = <ExperimentOutlined />;
              break;
            default:
              color = 'gray';
              icon = <FileTextOutlined />;
          }

          return (
            <Timeline.Item
              key={index}
              color={color}
              dot={icon}
              label={typeof item.data === 'object' && item.data.format
                ? item.data.format('DD/MM/YYYY HH:mm')
                : new Date(item.data).toLocaleString()}
            >              <Card
                title={
                  <span style={{ fontWeight: 'bold' }}>
                    {item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'obito' ? (
                      <span>
                        {item.tipo} <Tag color="red">Óbito</Tag>
                      </span>
                    ) : item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'transferido' ? (
                      <span>
                        {item.tipo} <Tag color="purple">Transferido</Tag>
                      </span>
                    ) : (
                      item.tipo
                    )}
                  </span>
                }
                size="small"
                style={{ 
                  marginBottom: 16,
                  ...(item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'obito' ? 
                    { borderColor: '#ff4d4f' } : {}),
                  ...(item.categoria === 'consulta' && item.dadosCompletos && item.dadosCompletos.status === 'transferido' ? 
                    { borderColor: '#722ed1' } : {})
                }}
              >
                {item.categoria === 'triagem' && renderTriagem(item.dadosCompletos)}
                {item.categoria === 'consulta' && renderConsulta(item.dadosCompletos)}
                {item.categoria === 'exame' && renderExame(item.dadosCompletos)}
              </Card>
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };

  const renderTriagensTab = () => {
    const triagens = historicoPaciente().filter(e => e.categoria === 'triagem');

    if (triagens.length === 0) {
      return <p>Não há triagens registradas para este paciente.</p>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {triagens.map((item, index) => (
          <Card
            key={index}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Triagem</span>
                <Tag color="blue">{new Date(item.data).toLocaleString()}</Tag>
              </div>
            }
            style={{ marginBottom: 10 }}
          >
            {renderTriagem(item.dadosCompletos)}
          </Card>
        ))}
      </div>
    );
  };

  const renderConsultasTab = () => {
    const consultas = historicoPaciente().filter(e => e.categoria === 'consulta');

    if (consultas.length === 0) {
      return <p>Não há consultas registradas para este paciente.</p>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {consultas.map((item, index) => (
          <Card
            key={index}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Consulta Médica</span>
                {item.dadosCompletos && item.dadosCompletos.status === 'obito' ? (
                  <Tag color="red">Óbito - {new Date(item.data).toLocaleString()}</Tag>
                ) : item.dadosCompletos && item.dadosCompletos.status === 'transferido' ? (
                  <Tag color="purple">Transferido - {new Date(item.data).toLocaleString()}</Tag>
                ) : (
                  <Tag color="green">{new Date(item.data).toLocaleString()}</Tag>
                )}
              </div>
            }
            style={{ 
              marginBottom: 10,
              ...(item.dadosCompletos && item.dadosCompletos.status === 'obito' ? 
                { borderColor: '#ff4d4f' } : {}),
              ...(item.dadosCompletos && item.dadosCompletos.status === 'transferido' ? 
                { borderColor: '#722ed1' } : {})
            }}
          >
            {renderConsulta(item.dadosCompletos)}
          </Card>
        ))}
      </div>
    );
  };

  const renderExamesTab = () => {
    const exames = historicoPaciente().filter(e => e.categoria === 'exame');

    if (exames.length === 0) {
      return <p>Não há exames registrados para este paciente.</p>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {exames.map((item, index) => (
          <Card
            key={index}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Exames Laboratoriais</span>
                <Tag color="purple">{new Date(item.data).toLocaleString()}</Tag>
              </div>
            }
            style={{ marginBottom: 10 }}
          >
            {renderExame(item.dadosCompletos)}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 1300, padding: 24 }}>
      <Card
        title="Arquivo Médico - Histórico Clínico Completo"
        extra={
          <Input.Search
            placeholder="Buscar paciente pelo nome"
            allowClear
            onChange={(e) => setFiltroNome(e.target.value)}
            style={{ width: 300 }}
          />
        }
        style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
      >
        <Table
          columns={columnsPacientes}
          dataSource={pacientesFiltrados}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Card>

      {/* Modal de Histórico Clínico */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Histórico Clínico Completo</span>
            <Button
              icon={<PrinterOutlined />}
              onClick={imprimirHistorico}
              disabled={!pacienteSelecionado}
            >
              Imprimir Histórico
            </Button>
          </div>
        }
        open={historicoVisivel}
        onCancel={fecharHistorico}
        footer={null}
        width={800}
      >
        {pacienteSelecionado && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions title="Informações do Paciente" bordered column={2}>
                <Descriptions.Item label="NID" span={2}>{pacienteSelecionado.nid}</Descriptions.Item>
                <Descriptions.Item label="Nome" span={2}>{pacienteSelecionado.nome}</Descriptions.Item>
                <Descriptions.Item label="apelido" span={2}>{pacienteSelecionado.apelido}</Descriptions.Item>
                <Descriptions.Item label="Data de Nascimento" span={2}>
                  {pacienteSelecionado.dataNascimento
                    ? (typeof pacienteSelecionado.dataNascimento === 'object' && pacienteSelecionado.dataNascimento.format
                      ? pacienteSelecionado.dataNascimento.format('DD/MM/YYYY')
                      : new Date(pacienteSelecionado.dataNascimento).toLocaleDateString())
                    : 'Não informado'}
                </Descriptions.Item>
                <Descriptions.Item label="tipoUtente" span={2}>{pacienteSelecionado.tipoUtente}</Descriptions.Item>
                <Descriptions.Item label="Telefone" span={2}>{pacienteSelecionado.celular}</Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>{pacienteSelecionado.email}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Divider />

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane
                tab={<span><FileTextOutlined /> Linha do Tempo</span>}
                key="timeline"
              >
                {renderHistoricoTimeline()}
              </TabPane>
              <TabPane
                tab={<span><HeartOutlined /> Triagens</span>}
                key="triagens"
              >
                {renderTriagensTab()}
              </TabPane>
              <TabPane
                tab={<span><MedicineBoxOutlined /> Consultas</span>}
                key="consultas"
              >
                {renderConsultasTab()}
              </TabPane>
              <TabPane
                tab={<span><ExperimentOutlined /> Exames</span>}
                key="exames"
              >
                {renderExamesTab()}
              </TabPane>
            </Tabs>
          </>
        )}
      </Modal>
    </div>
    </div>
  );
};

export default Arquivo;