# Integração Backend - Formulário Acompanhante

## Status Atual da Integração

### ✅ Já Integrado com Backend

1. **Hook `useConfigurations`** - Carrega dados de referência:
   - `provincias` - Lista de províncias do backend
   - `tiposUtentes` - Tipos de utentes
   - `racas` - Raças
   - `tiposDocumentos` - Tipos de documentos
   - `unidadesOrganicas` - Unidades orgânicas

2. **Hook `usePacientes`** - Gerencia pacientes:
   - `criarPaciente` - Cria novo paciente no backend
   - `atualizarPaciente` - Atualiza paciente existente
   - Normaliza dados: `camelCase` (frontend) ↔ `snake_case` (backend)

3. **Hook `useParentes`** - Gerencia parentes/acompanhantes:
   - `criarParente` - Cria parente via POST `/api/pacientes/{nid}/parentes`
   - `atualizarParente` - Atualiza parente via PUT `/api/parentes/{id}`
   - `deletarParente` - Deleta parente via DELETE `/api/parentes/{id}`
   - `carregarParentes` - Carrega parentes de um paciente

## Modelo Backend (Laravel)

### Paciente Model - Campos Principais
```php
protected $fillable = [
    'nid',                    // Gerado automaticamente (0001/2025)
    'nome',                   // Nome do paciente
    'apelido',                // Apelido/Sobrenome
    'data_nascimento',        // Data de nascimento
    'genero',                 // masculino|feminino|outro
    'estado_civil',           // solteiro|casado|divorciado|viuvo
    'raca_id',                // FK para tabela racas
    'nacionalidade',          // String - nacionalidade
    'tipo_utente_id',         // FK para tipos_utentes
    'unidade_organica_id',    // FK para unidades_organicas
    'celular',                // Celular principal
    'celular_alternativo',    // Celular secundário
    'email',                  // Email
    'whatsapp',               // WhatsApp
    'provincia_id',           // FK para provincias
    'distrito_id',            // FK para distritos
    'bairro_id',              // FK para bairros
    'avenida_rua_celula',     // Endereço linha 1
    'numero_casa',            // Número da casa
    'quarteirao',             // Quarteirão
    'tipo_documento_id',      // FK para tipos_documentos
    'documento_path',         // Path do arquivo anexado
    'status',                 // ativo|inativo|alta|obito
    // ... outros campos
];
```

### Parente Model - Campos
```php
protected $fillable = [
    'paciente_nid',           // NID do paciente (FK)
    'nome',                   // Nome completo do parente
    'grau_parentesco_id',     // FK para graus_parentesco
    'celular',                // Celular principal
    'celular_alternativo',    // Celular alternativo
];
```

## Como o Componente `acompanhanteSteps` Deve Usar o Backend

### 1. Step "Info. do Utente"

#### Campos que vêm do `provincias` (hook):
```jsx
{(!currentPaciente?.provincia || isEditModalVisible) && (
  <Col span={12}>
    <Form.Item name="provincia" label="Província" rules={[{ required: true }]}>
      <Select placeholder="Selecione a província">
        {/* ✅ JÁ USA O BACKEND */}
        {provincias.map(prov => (
          <Option key={prov.id} value={prov.id}>{prov.nome}</Option>
        ))}
      </Select>
    </Form.Item>
  </Col>
)}
```

#### ⚠️ Problema Identificado:
O código atual usa arrays hardcoded:
```jsx
// ❌ ERRADO - Dados hardcoded
{provincias.map(prov => (
  <Option key={prov} value={prov}>{prov}</Option>  // prov é string
))}
```

#### ✅ Solução Correta:
```jsx
// ✅ CORRETO - Usa objeto do backend
{provincias.map(prov => (
  <Option key={prov.id} value={prov.id}>{prov.nome}</Option>
))}
```

### 2. Cascade Loading (Província → Distrito → Bairro)

#### Como implementar:
```jsx
// Step 1: Província onChange
<Form.Item name="provincia_id" label="Província">
  <Select 
    placeholder="Selecione a província"
    onChange={(value) => {
      // Limpa distrito e bairro
      form.setFieldsValue({ distrito_id: null, bairro_id: null });
      // Carrega distritos da província
      carregarDistritosPorProvincia(value);
    }}
  >
    {provincias.map(p => (
      <Option key={p.id} value={p.id}>{p.nome}</Option>
    ))}
  </Select>
</Form.Item>

// Step 2: Distrito onChange
<Form.Item name="distrito_id" label="Distrito">
  <Select 
    placeholder="Selecione o distrito"
    onChange={(value) => {
      form.setFieldsValue({ bairro_id: null });
      carregarBairrosPorDistrito(value);
    }}
  >
    {distritos.map(d => (
      <Option key={d.id} value={d.id}>{d.nome}</Option>
    ))}
  </Select>
</Form.Item>

// Step 3: Bairro
<Form.Item name="bairro_id" label="Bairro">
  <Select placeholder="Selecione o bairro">
    {bairros.map(b => (
      <Option key={b.id} value={b.id}>{b.nome}</Option>
    ))}
  </Select>
</Form.Item>
```

### 3. Step "Perfil do Utente"

#### Tipos de Utente (do backend):
```jsx
<Form.Item name="tipoUtente" label="Tipo de Utente">
  <Select placeholder="Selecione o tipo de utente">
    {/* ✅ Deve usar tiposUtentes do hook */}
    {tiposUtentes.map(tipo => (
      <Option key={tipo.id} value={tipo.id}>{tipo.nome}</Option>
    ))}
  </Select>
</Form.Item>
```

#### Unidades Orgânicas (do backend):
```jsx
<Form.Item name="unidadeOrganica" label="Unidade Orgânica">
  <Select placeholder="Selecione a unidade orgânica">
    {/* ✅ Deve usar unidadesOrganicas do hook */}
    {unidadesOrganicas.map(uo => (
      <Option key={uo.id} value={uo.id}>{uo.nome}</Option>
    ))}
  </Select>
</Form.Item>
```

### 4. Step "Parentes"

#### ✅ Já integrado com backend via `useParentes`:
```jsx
<Form.List name="parentes">
  {(fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, ...restField }) => (
        <div key={key}>
          {/* Campos do parente */}
          <Form.Item {...restField} name={[name, 'nome']} label="Nome">
            <Input placeholder="Nome completo" />
          </Form.Item>
          
          <Form.Item {...restField} name={[name, 'grauParentesco']} label="Grau">
            <Select placeholder="Selecione">
              {/* ✅ Deve vir do backend: graus_parentesco */}
              <Option value="pai">Pai</Option>
              <Option value="mae">Mãe</Option>
              {/* ... */}
            </Select>
          </Form.Item>
          
          <Form.Item {...restField} name={[name, 'celular']} label="Celular">
            <Input placeholder="8XXXXXXXX" addonBefore="+258" />
          </Form.Item>
        </div>
      ))}
    </>
  )}
</Form.List>
```

## Mapeamento de Campos (Frontend ↔ Backend)

### Frontend (camelCase) → Backend (snake_case)

| Frontend              | Backend                | Tipo          |
|-----------------------|------------------------|---------------|
| `apelido`             | `apelido`              | string        |
| `nome`                | `nome`                 | string        |
| `dataNascimento`      | `data_nascimento`      | date          |
| `genero`              | `genero`               | string        |
| `estadoCivil`         | `estado_civil`         | string        |
| `raca`                | `raca_id`              | integer (FK)  |
| `nacionalidade`       | `nacionalidade`        | string        |
| `tipoUtente`          | `tipo_utente_id`       | integer (FK)  |
| `unidadeOrganica`     | `unidade_organica_id`  | integer (FK)  |
| `celular`             | `celular`              | string        |
| `celularalternativo`  | `celular_alternativo`  | string        |
| `email`               | `email`                | string        |
| `whatsApp`            | `whatsapp`             | string        |
| `provincia`           | `provincia_id`         | integer (FK)  |
| `distrito`            | `distrito_id`          | integer (FK)  |
| `bairro`              | `bairro_id`            | integer (FK)  |
| `avenidaRuaCelula`    | `avenida_rua_celula`   | string        |
| `numeroCasa`          | `numero_casa`          | string        |
| `quarteirao`          | `quarteirao`           | string        |
| `tipoDocumento`       | `tipo_documento_id`    | integer (FK)  |
| `documento`           | `documento_path`       | string (path) |

## Próximos Passos para Integração Completa

### 1. ✅ Substituir Arrays Hardcoded por Dados do Backend

**Arquivo:** `CadastroPaciente.jsx` - Linha ~2740-2760

```jsx
// ❌ REMOVER ESTES ARRAYS HARDCODED:
const tiposDocumento = [...];  // Linha ~2712
const provincias = [...];      // Removido ✅
const distritosMaputo = [...]; // Linha ~2750
const bairrosMaputo = [...];   // Linha ~2753
```

**Substituir por:**
```jsx
// ✅ USAR DADOS DO HOOK useConfigurations:
const {
  tiposUtentes,      // Do backend
  provincias,        // Do backend ✅
  distritos,         // Do backend (carregados dinamicamente)
  bairros,           // Do backend (carregados dinamicamente)
  racas,             // Do backend
  tiposDocumentos,   // Do backend
  unidadesOrganicas, // Do backend
  carregarDistritosPorProvincia,
  carregarBairrosPorDistrito
} = useConfigurations();
```

### 2. ⚠️ Implementar Cascade Loading

Adicionar `onChange` handlers para carregar dados dependentes:

```jsx
// Quando provincia é selecionada → carrega distritos
<Select onChange={(provinciaId) => {
  carregarDistritosPorProvincia(provinciaId);
  form.setFieldsValue({ distrito: null, bairro: null });
}}>
```

### 3. ⚠️ Usar IDs ao invés de Strings

**Problema atual:**
```jsx
// ❌ ERRADO - Salva string "Maputo Cidade"
<Option value="Maputo Cidade">Maputo Cidade</Option>
```

**Solução:**
```jsx
// ✅ CORRETO - Salva ID numérico
<Option value={provincia.id}>{provincia.nome}</Option>
```

### 4. ⚠️ Implementar Graus de Parentesco Dinâmicos

Criar novo endpoint no backend:
```php
// Backend: GET /api/graus-parentesco
Route::get('/graus-parentesco', [ConfigurationController::class, 'getGrausParentesco']);
```

Frontend:
```jsx
const { grausParentesco } = useConfigurations();

<Select placeholder="Selecione o grau">
  {grausParentesco.map(grau => (
    <Option key={grau.id} value={grau.id}>{grau.nome}</Option>
  ))}
</Select>
```

### 5. ✅ Salvar Parentes no Backend

O hook `useParentes` já está implementado e pronto para usar:

```jsx
// Ao submeter formulário de acompanhante:
const handleAcompanhanteFinish = async (values) => {
  try {
    // 1. Criar paciente
    const novoPaciente = await criarPaciente(values);
    
    // 2. Criar parentes
    if (values.parentes && values.parentes.length > 0) {
      for (const parente of values.parentes) {
        await criarParente(novoPaciente.nid, {
          nome: parente.nome,
          grauParentesco: parente.grauParentesco,
          celular: parente.celular,
          celularAlternativo: parente.celularAlternativo
        });
      }
    }
    
    message.success('Paciente e parentes cadastrados com sucesso!');
  } catch (error) {
    message.error('Erro ao cadastrar: ' + error.message);
  }
};
```

## Warnings do ESLint para Resolver

### Variáveis não utilizadas (podem ser removidas se não forem necessárias):

1. **Line 35**: `ensureArray` - Função não usada
2. **Line 42**: `normalizarExames` - Função não usada
3. **Line 76**: `marcarExameUtenteAutonomo` - Função não usada
4. **Line 82**: `setConsultasRealizadas` - State setter não usado
5. **Lines 102-111**: Variáveis do `useConfigurations` não usadas:
   - `tiposUtentes`, `distritos`, `bairros`, `racas`, `tiposDocumentos`, `unidadesOrganicas`
   - `configsLoading`, `carregarDistritosPorProvincia`, `carregarBairrosPorDistrito`
6. **Line 287**: `obterHistoricoConsultas` - Função não usada
7. **Line 1606**: `consultaComExames` - Variável não usada
8. **Lines 1802-1803**: `parentesBackend`, `parentesLoading` - Comentados até serem necessários
9. **Line 1834**: `handleAddAcompanhante` - Função não usada (comentada)
10. **Line 1943**: `acompanhantesColumns` - Colunas não usadas
11. **Line 2766**: `getFieldValueFromPaciente` - Função não usada
12. **Line 3514**: `handleAcompanhanteFinish` - Função não usada
13. **Lines 3601-3603**: `isVisible`, `modalTitle`, `patientData` - Variáveis não usadas
14. **Lines 3712, 3753-3754**: `tiposDocumento`, `distritosOptions`, `bairrosOptions` - Arrays não usados

### Problemas de Lógica:

1. **Lines 456, 459**: Mistura de operadores `||` e `&&` - Adicionar parênteses
2. **Line 762**: Hook `useEffect` tem dependências faltando
3. **Line 2813**: Hook `useEffect` tem dependências faltando
4. **Line 2816**: `acompanhanteSteps` deve ser memoizado com `useMemo`

## Resumo

### Status de Integração:

| Componente               | Status    | Observação                              |
|--------------------------|-----------|------------------------------------------|
| Provincias               | ✅ Integrado | Usando `useConfigurations`            |
| Distritos                | ⚠️ Parcial  | Hook pronto, falta implementar cascade |
| Bairros                  | ⚠️ Parcial  | Hook pronto, falta implementar cascade |
| Tipos Utentes            | ✅ Integrado | Hook pronto, falta usar no JSX        |
| Unidades Orgânicas       | ✅ Integrado | Hook pronto, falta usar no JSX        |
| Raças                    | ✅ Integrado | Hook pronto, falta usar no JSX        |
| Tipos Documentos         | ✅ Integrado | Hook pronto, falta usar no JSX        |
| Parentes                 | ✅ Integrado | Hook completo e funcional              |
| Criar Paciente           | ✅ Integrado | Função `criarPaciente` funcionando    |
| Graus Parentesco         | ❌ Falta    | Precisa criar endpoint no backend      |

### Próxima Ação Recomendada:

1. **Descomentar variáveis do `useConfigurations`** para uso completo
2. **Substituir todos os `<Option>` hardcoded** por dados do backend
3. **Implementar cascade loading** (província → distrito → bairro)
4. **Criar endpoint `/api/graus-parentesco`** no backend
5. **Resolver warnings do ESLint** removendo código não utilizado
