# Guia Rápido de Início - Sistema de Autenticação

## 🚀 Setup Rápido

### 1. Instalar Dependências
```bash
cd MagiscoreServer
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
# Mínimo necessário para começar:
PORT=8080
SESSION_SECRET=algum_texto_aleatorio_seguro
FRONTEND_URL=http://localhost:3000
```

### 3. (Opcional) Configurar Google OAuth

Para habilitar login com Google:

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto
3. Habilite Google+ API
4. Crie credenciais OAuth 2.0
5. Adicione no `.env`:
```env
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8080/server/auth/google/callback
```

### 4. Iniciar Servidor
```bash
npm start
```

## 📋 Checklist de Funcionalidades

### ✅ Implementado

- [x] Registro de usuários com 3 tipos (comum, advogado, magistrado)
- [x] Login tradicional com email/senha
- [x] Login com Google OAuth
- [x] Hash de senhas com bcrypt
- [x] Autenticação JWT
- [x] Middleware de autorização por tipo
- [x] Rotas protegidas por tipo de usuário
- [x] Atualização de tipo de usuário
- [x] Sistema de avaliação de magistrados
- [x] Ranking de magistrados

### 🎯 Tipos de Usuário

| Tipo | Cadastro Requer | Funcionalidades |
|------|----------------|-----------------|
| **Comum** | Nome, Email, Senha | Avaliar magistrados, ver ranking |
| **Advogado** | Nome, Email, Senha, **OAB** | Tudo do comum + rotas específicas |
| **Magistrado** | Nome, Email, Senha, **CNJ** | Tudo do comum + rotas específicas |

## 🔐 Fluxo de Autenticação

### Login Tradicional
```
1. POST /server/cria_usuario (registro)
2. POST /server/entrar_usuario (login)
3. Recebe { user, token }
4. Armazena token no localStorage
5. Usa token em headers: Authorization: Bearer {token}
```

### Login com Google
```
1. Redireciona para: GET /server/auth/google
2. Usuário autentica no Google
3. Google redireciona para callback
4. Servidor cria/atualiza usuário
5. Redireciona para: {FRONTEND_URL}/auth/callback?token={jwt}
6. Frontend extrai token da URL
7. Armazena token e usa em requisições
```

## 🧪 Teste Rápido

### 1. Criar Usuário Comum
```bash
curl -X POST http://localhost:8080/server/cria_usuario \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@teste.com","senha":"123456","tipo":"comum"}'
```

### 2. Fazer Login
```bash
curl -X POST http://localhost:8080/server/entrar_usuario \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","senha":"123456"}'
```

### 3. Copiar o token da resposta e testar rota protegida
```bash
curl -X GET http://localhost:8080/server/perfil \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🎨 Integração com Frontend (React)

### Criar Contexto de Autenticação

```javascript
// contexts/AuthContext.js
import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Verificar se token é válido
      fetch('http://localhost:8080/server/auth/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          logout();
        }
      });
    }
  }, [token]);

  const login = async (email, senha) => {
    const res = await fetch('http://localhost:8080/server/entrar_usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    }
    return false;
  };

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:8080/server/auth/google';
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Página de Login

```javascript
// pages/Login.js
import { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Login() {
  const { login, loginWithGoogle } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, senha);
    if (success) {
      // Redirecionar
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input 
          type="password" 
          value={senha} 
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
        />
        <button type="submit">Entrar</button>
      </form>
      
      <button onClick={loginWithGoogle}>
        Entrar com Google
      </button>
    </div>
  );
}
```

### Callback do Google

```javascript
// pages/AuthCallback.js
import { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Buscar dados do usuário
      fetch('http://localhost:8080/server/perfil', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(user => {
        setUser(user);
        navigate('/dashboard');
      });
    }
  }, []);

  return <div>Autenticando...</div>;
}
```

### Rotas Protegidas

```javascript
// components/ProtectedRoute.js
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredType }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredType && user.tipo !== requiredType) {
    return <Navigate to="/acesso-negado" />;
  }

  return children;
}

// Uso:
<Route path="/advogado" element={
  <ProtectedRoute requiredType="advogado">
    <AdvogadoPage />
  </ProtectedRoute>
} />
```

## 📚 Documentação Completa

- `AUTENTICACAO.md` - Documentação completa da API
- `TESTES_API.md` - Exemplos de testes com curl
- `.env.example` - Variáveis de ambiente necessárias

## 🐛 Solução de Problemas

### "Cannot find module 'passport'"
```bash
npm install
```

### "GOOGLE_CLIENT_ID is not defined"
- Configure as variáveis no arquivo `.env`
- Ou remova o login com Google temporariamente

### "MongoDB connection error"
- Verifique sua string de conexão MongoDB
- Certifique-se que o cluster está ativo

### CORS Error no Frontend
- Configure `FRONTEND_URL` no `.env`
- Certifique-se que o CORS está habilitado corretamente

## 📞 Suporte

Para mais informações, consulte os arquivos:
- `AUTENTICACAO.md`
- `TESTES_API.md`
