# Sistema de Autenticação MagiScore

## Configuração do Google OAuth

### 1. Criar Credenciais Google
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em "APIs e Serviços" > "Credenciais"
4. Clique em "Criar Credenciais" > "ID do cliente OAuth"
5. Configure a tela de consentimento OAuth se necessário
6. Selecione "Aplicativo da Web"
7. Adicione as URLs de redirecionamento autorizadas:
   - `http://localhost:8080/server/auth/google/callback` (desenvolvimento)
   - `https://seu-dominio.com/server/auth/google/callback` (produção)
8. Copie o Client ID e Client Secret

### 2. Configurar Variáveis de Ambiente
1. Copie o arquivo `.env.example` para `.env`
2. Preencha as variáveis:
   - `GOOGLE_CLIENT_ID`: Cole o Client ID obtido
   - `GOOGLE_CLIENT_SECRET`: Cole o Client Secret obtido
   - `GOOGLE_CALLBACK_URL`: URL de callback configurada
   - `FRONTEND_URL`: URL do seu frontend
   - `SESSION_SECRET`: Gere uma string aleatória segura

## Tipos de Usuários

O sistema suporta 3 tipos de usuários:

### 1. Usuário Comum (`comum`)
- Pode criar conta e fazer login
- Pode avaliar magistrados
- Pode ver ranking de magistrados

### 2. Advogado (`advogado`)
- Todas as funcionalidades do usuário comum
- Requer número OAB no cadastro
- Acesso a rotas específicas para advogados

### 3. Magistrado (`magistrado`)
- Todas as funcionalidades do usuário comum
- Requer número CNJ no cadastro
- Acesso a rotas específicas para magistrados

## Rotas da API

### Autenticação

#### Registro de Usuário
```http
POST /server/cria_usuario
Content-Type: application/json

{
  "nome": "Nome do Usuário",
  "email": "email@exemplo.com",
  "senha": "senha123",
  "tipo": "comum|advogado|magistrado",
  "oab": "SP123456" (obrigatório se tipo=advogado),
  "cnj": "123456" (obrigatório se tipo=magistrado)
}
```

#### Login Tradicional
```http
POST /server/entrar_usuario
Content-Type: application/json

{
  "email": "email@exemplo.com",
  "senha": "senha123"
}
```

#### Login com Google
```http
GET /server/auth/google
```
Redireciona para a página de login do Google. Após autenticação bem-sucedida, redireciona para:
```
{FRONTEND_URL}/auth/callback?token={JWT_TOKEN}
```

#### Verificar Status de Autenticação
```http
GET /server/auth/status
Authorization: Bearer {token}
```

### Usuário

#### Ver Perfil
```http
GET /server/perfil
Authorization: Bearer {token}
```

#### Atualizar Tipo de Usuário
```http
PUT /server/atualizar_tipo
Authorization: Bearer {token}
Content-Type: application/json

{
  "tipo": "advogado|magistrado",
  "oab": "SP123456" (se tipo=advogado),
  "cnj": "123456" (se tipo=magistrado)
}
```

#### Ver Minhas Avaliações
```http
GET /server/usuario/minhas_avaliacoes
Authorization: Bearer {token}
```

### Magistrados

#### Buscar Magistrado (API Externa)
```http
POST /server/buscar_magistrado
Content-Type: application/json

{
  "texto": "nome do magistrado"
}
```

#### Avaliar Magistrado
```http
POST /server/avaliar_magistrado
Authorization: Bearer {token}
Content-Type: application/json

{
  "nomeMagistrado": "Nome do Magistrado",
  "idadeMagistrado": "45",
  "nota": 4,
  "comentario": "Excelente juiz"
}
```

#### Ranking de Magistrados
```http
GET /server/ranking_magistrados
```

#### Ver Avaliações de um Magistrado
```http
GET /server/avaliacoes_magistrado/:magistradoId
```

### Rotas Específicas por Tipo

#### Advogados - Ver Clientes
```http
GET /server/advogado/clientes
Authorization: Bearer {token}
```
**Requer**: tipo de usuário = `advogado`

#### Magistrados - Ver Estatísticas
```http
GET /server/magistrado/estatisticas
Authorization: Bearer {token}
```
**Requer**: tipo de usuário = `magistrado`

## Estrutura do Token JWT

O token JWT contém as seguintes informações:
```json
{
  "id": "usuario_id",
  "tipo": "comum|advogado|magistrado",
  "email": "email@exemplo.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Middleware de Autorização

### authenticateToken
Verifica se o usuário está autenticado (tem token válido)

### requireUserType(...types)
Verifica se o usuário tem um dos tipos especificados

Exemplo de uso no código:
```javascript
router.get('/rota-protegida', 
  authenticateToken, 
  requireUserType('advogado', 'magistrado'), 
  (req, res) => {
    // Apenas advogados e magistrados podem acessar
  }
);
```

## Fluxo de Autenticação com Google

1. Frontend redireciona para: `GET /server/auth/google`
2. Usuário faz login no Google
3. Google redireciona de volta para: `/server/auth/google/callback`
4. Servidor verifica credenciais e cria/atualiza usuário
5. Servidor redireciona para: `{FRONTEND_URL}/auth/callback?token={JWT_TOKEN}`
6. Frontend extrai o token da URL e armazena localmente
7. Frontend usa o token para fazer requisições autenticadas

## Exemplo de Uso no Frontend

```javascript
// Login tradicional
const login = async (email, senha) => {
  const response = await fetch('http://localhost:8080/server/entrar_usuario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data.user;
};

// Login com Google
const loginWithGoogle = () => {
  window.location.href = 'http://localhost:8080/server/auth/google';
};

// Callback do Google (página /auth/callback)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem('token', token);
    // Redirecionar para dashboard
    navigate('/dashboard');
  }
}, []);

// Fazer requisição autenticada
const fazerRequisicao = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:8080/server/perfil', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

## Segurança

- Senhas são hasheadas com bcrypt (10 rounds)
- Tokens JWT expiram em 24 horas
- CORS configurado para aceitar apenas o frontend especificado
- Sessões com cookie seguro em produção
- Validação de tipos de usuário em rotas protegidas

## Erros Comuns

### "Esta conta usa login do Google"
- O usuário tentou fazer login tradicional, mas a conta foi criada via Google
- Solução: Usar login do Google

### "OAB é obrigatória para advogados"
- Tentou criar/atualizar usuário para advogado sem fornecer OAB
- Solução: Fornecer número da OAB

### "Acesso negado"
- Tentou acessar rota protegida sem as permissões necessárias
- Solução: Verificar tipo de usuário e fazer upgrade se necessário
