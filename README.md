# 🏥 Sistema de Gestão de Clínica

Este é um sistema de gestão para clínica Universitária da UEM, projetado para otimizar o fluxo de trabalho médico e administrativo. Permite o gerenciamento completo de pacientes, consultas, exames, triagens e procedimentos diversos.

---

## ✨ Funcionalidades Principais

* **Autenticação de Usuários**: Login seguro com diferentes níveis de acesso.
* **Gestão de Pacientes**: Cadastro, busca e histórico médico completo.
* **Agendamento de Consultas**: Marcação e controle de consultas médicas.
* **Triagem**: Registro de sinais vitais e informações preliminares.
* **Consultório Médico**: Diagnósticos, prescrições e solicitações de exames.
* **Laboratório**: Gestão de exames laboratoriais e resultados.
* **Enfermaria**: Controle de pacientes em observação.
* **Alta, Óbito e Transferência**: Registro e acompanhamento dos desfechos.
* **Relatórios e Estatísticas**: Visualização consolidada para tomada de decisão.

---

## 🛠️ Tecnologias Utilizadas

* **React**: Biblioteca JavaScript para construção da interface.
* **Ant Design**: Framework moderno de componentes UI.
* **Context API**: Gerenciamento de estado global da aplicação.

---

## ⚙️ Instalação e Configuração

1. **Clone o repositório**

   ```bash
	git clone https://JoCarlos12@bitbucket.org/jcarlos2025/clinica_frontend.git
   cd clinica_frontend
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento**

   ```bash
   npm start
   ```

4. **Para gerar a versão de produção**

   ```bash
   npm run build
   ```

---

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── arquivo/          # Gestão de documentos e registros
│   ├── atendimento/      # Fluxo de atendimento inicial
│   ├── auth/             # Autenticação e controle de acesso
│   ├── consultorio/      # Funcionalidades do consultório médico
│   ├── dashboard/        # Painéis e estatísticas
│   ├── enfermaria/       # Gestão da observação de pacientes
│   ├── laboratorio/      # Gestão de exames laboratoriais
│   ├── layout/           # Componentes estruturais da interface
│   └── user/             # Gestão de usuários
├── context/
│   └── ClinicContext.jsx # Estado global da clínica
```

---

## 🔁 Fluxo de Trabalho

1. Recepção e cadastro do paciente
2. Triagem com coleta de dados iniciais
3. Consulta médica com diagnóstico e prescrição
4. Realização de exames (quando solicitados)
5. Observação em enfermaria (se necessário)
6. Alta médica, transferência ou registro de óbito

---

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua funcionalidade

   ```bash
   git checkout -b feature/sua-funcionalidade
   ```
3. Faça commit das alterações

   ```bash
   git commit -m "Adiciona nova funcionalidade"
   ```
4. Faça push para a sua branch

   ```bash
   git push origin feature/sua-funcionalidade
   ```
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é de uso exclusivo da instituição CIUEM.  
Este projeto é de código fechado. Todos os direitos reservados © 2025 JCarlos.  
Não é permitida a distribuição ou modificação sem autorização prévia.


---

## 📬 Contato

📧 Email: jcdonca@gmail.com
💻 GitHub: https://bitbucket.org/jcarlos2025/


---

## 🏢 Desenvolvido para

Clínica Universitária da UEM


