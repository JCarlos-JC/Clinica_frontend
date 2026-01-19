import React, { useState, useEffect } from 'react';
import { triagemService } from '../services';

/**
 * Lista de Triagens Component
 */
const TriagensListComponent = () => {
  const [triagens, setTriagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
  });

  // Load triagens on component mount and when filters change
  useEffect(() => {
    loadTriagens();
  }, [filters]);

  const loadTriagens = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await triagemService.list(filters);
      setTriagens(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar triagens');
      console.error('Error loading triagens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
      page: 1, // Reset to first page when filters change
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta triagem?')) {
      return;
    }

    try {
      await triagemService.delete(id);
      loadTriagens(); // Reload list
      alert('Triagem excluída com sucesso!');
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao excluir triagem');
      console.error('Error deleting triagem:', err);
    }
  };

  if (loading) {
    return <div className="loading">Carregando triagens...</div>;
  }

  if (error) {
    return <div className="error">Erro: {error}</div>;
  }

  return (
    <div className="triagens-list">
      <h2>Lista de Triagens</h2>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Buscar por NID, nome..."
          value={filters.search}
          onChange={handleFilterChange}
        />

        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">Todos os status</option>
          <option value="aguardando_triagem">Aguardando Triagem</option>
          <option value="triagem_concluida">Triagem Concluída</option>
          <option value="em_atendimento">Em Atendimento</option>
        </select>

        <button onClick={loadTriagens}>Atualizar</button>
      </div>

      {/* Triagens Table */}
      <table className="triagens-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>NID</th>
            <th>Nome</th>
            <th>Motivo</th>
            <th>Status</th>
            <th>Classificação</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {triagens.length === 0 ? (
            <tr>
              <td colSpan="8">Nenhuma triagem encontrada</td>
            </tr>
          ) : (
            triagens.map((triagem) => (
              <tr key={triagem.id}>
                <td>{triagem.id}</td>
                <td>{triagem.nid}</td>
                <td>{triagem.nome}</td>
                <td>{triagem.motivo}</td>
                <td>
                  <span className={`status ${triagem.status}`}>
                    {triagem.status}
                  </span>
                </td>
                <td>
                  <span className={`classificacao ${triagem.classificacao_risco}`}>
                    {triagem.classificacao_risco}
                  </span>
                </td>
                <td>{new Date(triagem.created_at).toLocaleString()}</td>
                <td>
                  <button onClick={() => window.location.href = `/triagens/${triagem.id}`}>
                    Ver
                  </button>
                  <button onClick={() => handleDelete(triagem.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TriagensListComponent;
