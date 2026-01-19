# 📋 Campos Completos do Paciente (Utente Regular)

Este documento lista TODOS os campos do formulário de cadastro de paciente que devem ser enviados ao backend Laravel.

## 🔑 Estrutura de Dados para Backend (snake_case)

```javascript
const dadosPacienteCompleto = {
  // ==================== INFORMAÇÕES PESSOAIS OBRIGATÓRIAS ====================
  nome: string,                    // Nome do paciente (obrigatório)
  apelido: string,                 // Apelido/Sobrenome (obrigatório)
  data_nascimento: string,         // Data no formato 'YYYY-MM-DD' (obrigatório)
  genero: string,                  // 'M' ou 'F' (obrigatório)
  celular: string,                 // Número de celular sem formatação (obrigatório)
  
  // ==================== INFORMAÇÕES PESSOAIS OPCIONAIS ====================
  estado_civil: string,            // Estado civil do paciente
  nacionalidade: string,           // Nacionalidade do paciente
  
  // ==================== DOCUMENTO DE IDENTIFICAÇÃO ====================
  bilhete_identidade: string,      // Número do documento de identidade
  tipo_documento_id: number,       // ID do tipo de documento (ref: tipo_documentos)
  documento_path: string,          // Caminho do arquivo de documento anexado
  
  // ==================== IDs DE REFERÊNCIA (Foreign Keys) ====================
  raca_id: number,                 // ID da raça (ref: racas table)
  tipo_utente_id: number,          // ID do tipo de utente (ref: tipo_utentes)
  unidade_organica_id: number,     // ID da unidade orgânica (ref: unidade_organicas)
  
  // ==================== INFORMAÇÕES DE CONTATO ====================
  celular_alternativo: string,     // Número de celular alternativo
  email: string,                   // Email do paciente (lowercase)
  whatsapp: string,                // Número do WhatsApp
  
  // ==================== ENDEREÇO COMPLETO ====================
  provincia_id: number,            // ID da província (ref: provincias)
  // OU
  provincia: string,               // Nome da província (se não tiver ID)
  
  distrito_id: number,             // ID do distrito (ref: distritos)
  bairro_id: number,               // ID do bairro (ref: bairros)
  avenida_rua_celula: string,      // Endereço: Avenida/Rua/Célula
  numero_casa: string,             // Número da casa
  quarteirao: string,              // Quarteirão
  
  // ==================== INFORMAÇÕES ADICIONAIS ====================
  hospital_proveniencia: string,   // Hospital de proveniência
  nome_familiar: string,           // Nome de um familiar de contato
  observacoes: string,             // Observações gerais sobre o paciente
  
  // ==================== STATUS ====================
  status: string                   // Status do paciente: 'ativo' | 'inativo'
};
```

## 📊 Mapeamento Frontend (camelCase) → Backend (snake_case)

| Campo Frontend (Form.Item name) | Campo Backend (Laravel) | Tipo | Obrigatório | Observações |
|----------------------------------|-------------------------|------|-------------|-------------|
| `nome` | `nome` | string | ✅ Sim | Nome do paciente |
| `apelido` | `apelido` | string | ✅ Sim | Sobrenome/Apelido |
| `dataNascimento` | `data_nascimento` | date | ✅ Sim | Formato: YYYY-MM-DD |
| `genero` | `genero` | string | ✅ Sim | 'M' ou 'F' |
| `celular` | `celular` | string | ✅ Sim | Apenas dígitos |
| `estadoCivil` | `estado_civil` | string | ❌ Não | Estado civil |
| `nacionalidade` | `nacionalidade` | string | ❌ Não | Nacionalidade |
| `bilheteIdentidade` | `bilhete_identidade` | string | ❌ Não | Número do BI |
| `tipoDocumento` | `tipo_documento_id` | number | ❌ Não | ID do tipo (1-4) |
| `documento` | `documento_path` | string | ❌ Não | Caminho do arquivo |
| `raca` | `raca_id` | number | ❌ Não | ID da raça |
| `tipoUtente` | `tipo_utente_id` | number | ❌ Não | ID do tipo (1-11) |
| `unidadeOrganica` | `unidade_organica_id` | number | ❌ Não | ID da unidade |
| `celularAlternativo` | `celular_alternativo` | string | ❌ Não | Apenas dígitos |
| `email` | `email` | string | ❌ Não | Email válido |
| `whatsApp` | `whatsapp` | string | ❌ Não | Apenas dígitos |
| `provincia` | `provincia_id` ou `provincia` | number/string | ❌ Não | ID ou nome |
| `distrito` | `distrito_id` | number | ❌ Não | ID do distrito |
| `bairro` | `bairro_id` | number | ❌ Não | ID do bairro |
| `avenidaRuaCelula` | `avenida_rua_celula` | string | ❌ Não | Endereço |
| `numeroCasa` | `numero_casa` | string | ❌ Não | Número da casa |
| `quarteirao` | `quarteirao` | string | ❌ Não | Quarteirão |
| `hospitalProveniencia` | `hospital_proveniencia` | string | ❌ Não | Hospital origem |
| `nomeFamiliar` | `nome_familiar` | string | ❌ Não | Contato familiar |
| `observacoes` | `observacoes` | text | ❌ Não | Observações |
| - | `status` | string | ✅ Sim | Sempre 'ativo' |

## 🎯 Tipos de Utente (tipo_utente_id)

```javascript
const TIPOS_UTENTE = {
  1: 'Estudante Não Bolseiro',
  2: 'Estudante Bolseiro',
  3: 'Estudante de Mestrado',
  4: 'Estudante de Doutoramento',
  5: 'Investigador',
  6: 'Docente',
  7: 'Funcionário',
  8: 'Familiar de Docente',
  9: 'Familiar de Funcionário',
  10: 'Familiar de Investigador',
  11: 'Comunidade'
};

// Mapeamento Frontend → ID
const mapeamentoTipoUtente = {
  'estudanteNaoBolseiro': 1,
  'estudanteBolseiro': 2,
  'estudanteMestrado': 3,
  'estudanteDoutoramento': 4,
  'investigador': 5,
  'docente': 6,
  'funcionario': 7,
  'familiarDocente': 8,
  'familiarFuncionario': 9,
  'familiarInvestigador': 10,
  'comunidade': 11
};
```

## 📝 Exemplo de Payload Completo para Backend

```json
{
  "nome": "João",
  "apelido": "Silva",
  "data_nascimento": "1990-05-15",
  "genero": "M",
  "celular": "849876543",
  "estado_civil": "Solteiro",
  "nacionalidade": "Moçambicana",
  "bilhete_identidade": "120300123456A",
  "tipo_documento_id": 1,
  "raca_id": 3,
  "tipo_utente_id": 6,
  "unidade_organica_id": 2,
  "celular_alternativo": "843456789",
  "email": "joao.silva@example.com",
  "whatsapp": "849876543",
  "provincia_id": 1,
  "distrito_id": 5,
  "bairro_id": 12,
  "avenida_rua_celula": "Avenida Julius Nyerere",
  "numero_casa": "123",
  "quarteirao": "4",
  "hospital_proveniencia": "Hospital Central de Maputo",
  "nome_familiar": "Maria Silva",
  "observacoes": "Paciente com histórico de hipertensão",
  "status": "ativo"
}
```

## 🔍 Validações no Backend (PacienteController)

### Campos Obrigatórios Validados:
- `nome` → required|string|max:255
- `apelido` → required|string|max:255
- `data_nascimento` → required|date|before:today
- `genero` → required|in:M,F
- `celular` → required|string|regex:/^[0-9]{9}$/

### IDs de Referência Externa (Validados pelo ConfigurationService):
- `raca_id` → exists_in_service:configuration,racas
- `tipo_utente_id` → exists_in_service:configuration,tipo_utentes
- `unidade_organica_id` → exists_in_service:configuration,unidade_organicas
- `tipo_documento_id` → exists_in_service:configuration,tipo_documentos

### Campos Opcionais com Validação:
- `email` → nullable|email|unique:pacientes,email
- `bilhete_identidade` → nullable|string|unique:pacientes,bilhete_identidade
- `celular_alternativo` → nullable|string|regex:/^[0-9]{9}$/
- `whatsapp` → nullable|string|regex:/^[0-9]{9}$/

## 🚨 Campos que NUNCA devem ser enviados ao Backend

```javascript
// ❌ NÃO ENVIAR ESTES CAMPOS:
{
  dataNascimento,        // Usar data_nascimento
  tipoUtente,           // Usar tipo_utente_id
  celularAlternativo,   // Usar celular_alternativo
  celularalternativo,   // Duplicata com erro de digitação
  unidadeOrganica,      // Usar unidade_organica_id
  tipoDocumento,        // Usar tipo_documento_id
  // Qualquer campo em camelCase que não seja nome/apelido/genero
}
```

## ✅ Código de Preparação dos Dados (handleCreate)

```javascript
const handleCreate = async (values) => {
  const dadosPaciente = {};
  
  // OBRIGATÓRIOS
  if (values.nome?.trim()) dadosPaciente.nome = values.nome.trim();
  if (values.apelido?.trim()) dadosPaciente.apelido = values.apelido.trim();
  if (values.dataNascimento) {
    dadosPaciente.data_nascimento = dayjs.isDayjs(values.dataNascimento) ? 
      values.dataNascimento.format('YYYY-MM-DD') : 
      dayjs(values.dataNascimento).format('YYYY-MM-DD');
  }
  if (values.genero) dadosPaciente.genero = values.genero;
  if (values.celular?.replace(/\D/g, '')) {
    dadosPaciente.celular = values.celular.replace(/\D/g, '');
  }
  
  // PESSOAIS OPCIONAIS
  if (values.estadoCivil) dadosPaciente.estado_civil = values.estadoCivil;
  if (values.nacionalidade) dadosPaciente.nacionalidade = values.nacionalidade;
  
  // DOCUMENTO
  if (values.bilheteIdentidade?.trim()) {
    dadosPaciente.bilhete_identidade = values.bilheteIdentidade.trim();
  }
  if (values.tipoDocumento && !isNaN(values.tipoDocumento)) {
    dadosPaciente.tipo_documento_id = parseInt(values.tipoDocumento);
  }
  if (values.documentoPath) {
    dadosPaciente.documento_path = values.documentoPath;
  }
  
  // IDs DE REFERÊNCIA (Validar antes!)
  if (values.raca && !isNaN(values.raca)) {
    dadosPaciente.raca_id = parseInt(values.raca);
  }
  if (tipoUtenteId && !isNaN(tipoUtenteId)) {
    dadosPaciente.tipo_utente_id = parseInt(tipoUtenteId);
  }
  if (values.unidadeOrganica && !isNaN(values.unidadeOrganica)) {
    dadosPaciente.unidade_organica_id = parseInt(values.unidadeOrganica);
  }
  
  // CONTATOS
  const celularAlt = (values.celularAlternativo || values.celularalternativo)?.replace(/\D/g, '');
  if (celularAlt) dadosPaciente.celular_alternativo = celularAlt;
  
  if (values.email?.trim()) {
    dadosPaciente.email = values.email.trim().toLowerCase();
  }
  if (values.whatsApp?.replace(/\D/g, '')) {
    dadosPaciente.whatsapp = values.whatsApp.replace(/\D/g, '');
  }
  
  // ENDEREÇO
  if (values.provincia) {
    if (!isNaN(values.provincia)) {
      dadosPaciente.provincia_id = parseInt(values.provincia);
    } else {
      dadosPaciente.provincia = values.provincia;
    }
  }
  if (values.distrito && !isNaN(values.distrito)) {
    dadosPaciente.distrito_id = parseInt(values.distrito);
  }
  if (values.bairro && !isNaN(values.bairro)) {
    dadosPaciente.bairro_id = parseInt(values.bairro);
  }
  if (values.avenidaRuaCelula?.trim()) {
    dadosPaciente.avenida_rua_celula = values.avenidaRuaCelula.trim();
  }
  if (values.numeroCasa?.trim()) {
    dadosPaciente.numero_casa = values.numeroCasa.trim();
  }
  if (values.quarteirao?.trim()) {
    dadosPaciente.quarteirao = values.quarteirao.trim();
  }
  
  // HOSPITAL E FAMILIAR
  if (values.hospitalProveniencia?.trim()) {
    dadosPaciente.hospital_proveniencia = values.hospitalProveniencia.trim();
  }
  if (values.nomeFamiliar?.trim()) {
    dadosPaciente.nome_familiar = values.nomeFamiliar.trim();
  }
  
  // OBSERVAÇÕES
  if (values.observacoes?.trim()) {
    dadosPaciente.observacoes = values.observacoes.trim();
  }
  
  // STATUS (SEMPRE ATIVO PARA NOVOS)
  dadosPaciente.status = 'ativo';
  
  // Enviar ao backend
  const resultado = await criarPaciente(dadosPaciente);
};
```

## 🎨 Steps do Formulário

O formulário é dividido em 4 etapas (Steps):

### Step 0: Informações Básicas
- nome, apelido, dataNascimento, genero
- bilheteIdentidade, tipoDocumento
- hospitalProveniencia

### Step 1: Informações Pessoais
- estadoCivil, raca, nacionalidade
- provincia, distrito, bairro
- avenidaRuaCelula, quarteirao, numeroCasa
- documento (upload)

### Step 2: Informações de Contato
- celular, celularAlternativo, email, whatsApp
- nomeFamiliar

### Step 3: Tipo de Utente
- tipoUtente, unidadeOrganica
- observacoes

## 📌 Notas Importantes

1. **Sempre validar IDs de referência** antes de enviar ao backend usando o endpoint `/pacientes/config-options`
2. **Usar snake_case** para todos os campos enviados ao Laravel
3. **Remover formatação** de telefones (deixar só números)
4. **Converter datas** para formato 'YYYY-MM-DD'
5. **Lowercase no email** para padronização
6. **Status sempre 'ativo'** para novos cadastros
7. **Não enviar campos undefined/null** - filtrar antes

## 🔗 Endpoints do Backend

### Criar Paciente
```
POST /api/pacientes
Content-Type: application/json
Authorization: Bearer {token}

Body: {dadosPaciente} (objeto acima)
```

### Buscar Configurações Válidas
```
GET /api/pacientes/config-options
Authorization: Bearer {token}

Response: {
  success: true,
  data: {
    racas: [{id, nome}],
    tipos_utentes: [{id, nome}],
    unidades_organicas: [{id, nome}],
    tipos_documentos: [{id, nome}]
  }
}
```

---

**Última atualização:** 16 de Novembro de 2025
