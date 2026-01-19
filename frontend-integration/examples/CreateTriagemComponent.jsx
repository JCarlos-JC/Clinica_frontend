import React, { useState } from 'react';
import { triagemService, sinaisVitaisService } from '../services';

/**
 * Criar Triagem Component
 */
const CreateTriagemComponent = () => {
  const [step, setStep] = useState(1); // 1: Triagem, 2: Sinais Vitais
  const [triagemId, setTriagemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [triagemData, setTriagemData] = useState({
    paciente_id: '',
    motivo: '',
    queixa_principal: '',
    classificacao_risco: 'normal',
  });

  const [sinaisVitaisData, setSinaisVitaisData] = useState({
    pressao_arterial: '',
    peso: '',
    altura: '',
    frequencia_cardiaca: '',
    temperatura: '',
    oximetria: '',
    glicemia_capilar: '',
    frequencia_respiratoria: '',
    escala_dor: '',
  });

  const handleTriagemChange = (e) => {
    setTriagemData({
      ...triagemData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSinaisVitaisChange = (e) => {
    setSinaisVitaisData({
      ...sinaisVitaisData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTriagemSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await triagemService.create(triagemData);
      setTriagemId(response.data.id);
      setStep(2); // Move to sinais vitais step
      alert('Triagem criada com sucesso! Agora registre os sinais vitais.');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar triagem');
      console.error('Error creating triagem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSinaisVitaisSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sinaisVitaisService.create({
        ...sinaisVitaisData,
        triagem_id: triagemId,
      });
      
      alert('Sinais vitais registrados com sucesso!');
      
      // Redirect to triagem details
      window.location.href = `/triagens/${triagemId}`;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar sinais vitais');
      console.error('Error creating sinais vitais:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-triagem-container">
      <h2>Nova Triagem</h2>

      {/* Step indicator */}
      <div className="steps">
        <div className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          1. Dados da Triagem
        </div>
        <div className={`step ${step === 2 ? 'active' : ''}`}>
          2. Sinais Vitais
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Step 1: Triagem */}
      {step === 1 && (
        <form onSubmit={handleTriagemSubmit}>
          <div className="form-group">
            <label htmlFor="paciente_id">ID do Paciente *</label>
            <input
              type="number"
              id="paciente_id"
              name="paciente_id"
              value={triagemData.paciente_id}
              onChange={handleTriagemChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="motivo">Motivo da Consulta *</label>
            <input
              type="text"
              id="motivo"
              name="motivo"
              value={triagemData.motivo}
              onChange={handleTriagemChange}
              required
              placeholder="Ex: Febre alta"
            />
          </div>

          <div className="form-group">
            <label htmlFor="queixa_principal">Queixa Principal *</label>
            <textarea
              id="queixa_principal"
              name="queixa_principal"
              value={triagemData.queixa_principal}
              onChange={handleTriagemChange}
              required
              rows="4"
              placeholder="Descreva a queixa do paciente..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="classificacao_risco">Classificação de Risco *</label>
            <select
              id="classificacao_risco"
              name="classificacao_risco"
              value={triagemData.classificacao_risco}
              onChange={handleTriagemChange}
              required
            >
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
              <option value="muito_urgente">Muito Urgente</option>
              <option value="emergencia">Emergência</option>
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Próximo →'}
          </button>
        </form>
      )}

      {/* Step 2: Sinais Vitais */}
      {step === 2 && (
        <form onSubmit={handleSinaisVitaisSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pressao_arterial">Pressão Arterial * (Ex: 120/80)</label>
              <input
                type="text"
                id="pressao_arterial"
                name="pressao_arterial"
                value={sinaisVitaisData.pressao_arterial}
                onChange={handleSinaisVitaisChange}
                required
                pattern="\d{3}/\d{2}"
                placeholder="120/80"
              />
            </div>

            <div className="form-group">
              <label htmlFor="peso">Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                id="peso"
                name="peso"
                value={sinaisVitaisData.peso}
                onChange={handleSinaisVitaisChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="altura">Altura (cm) *</label>
              <input
                type="number"
                id="altura"
                name="altura"
                value={sinaisVitaisData.altura}
                onChange={handleSinaisVitaisChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="frequencia_cardiaca">Frequência Cardíaca (bpm) *</label>
              <input
                type="number"
                id="frequencia_cardiaca"
                name="frequencia_cardiaca"
                value={sinaisVitaisData.frequencia_cardiaca}
                onChange={handleSinaisVitaisChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperatura">Temperatura (°C) *</label>
              <input
                type="number"
                step="0.1"
                id="temperatura"
                name="temperatura"
                value={sinaisVitaisData.temperatura}
                onChange={handleSinaisVitaisChange}
                required
                min="30"
                max="45"
              />
            </div>

            <div className="form-group">
              <label htmlFor="oximetria">Oximetria (%)</label>
              <input
                type="number"
                id="oximetria"
                name="oximetria"
                value={sinaisVitaisData.oximetria}
                onChange={handleSinaisVitaisChange}
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="glicemia_capilar">Glicemia Capilar (mg/dL)</label>
              <input
                type="number"
                id="glicemia_capilar"
                name="glicemia_capilar"
                value={sinaisVitaisData.glicemia_capilar}
                onChange={handleSinaisVitaisChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="frequencia_respiratoria">Frequência Respiratória</label>
              <input
                type="number"
                id="frequencia_respiratoria"
                name="frequencia_respiratoria"
                value={sinaisVitaisData.frequencia_respiratoria}
                onChange={handleSinaisVitaisChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="escala_dor">Escala de Dor (0-10)</label>
              <input
                type="number"
                id="escala_dor"
                name="escala_dor"
                value={sinaisVitaisData.escala_dor}
                onChange={handleSinaisVitaisChange}
                min="0"
                max="10"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setStep(1)}>
              ← Voltar
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Finalizar Triagem'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateTriagemComponent;
