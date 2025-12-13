# Exemplos de Testes das Rotas - MagiScore API

## 1. Criar Usuário Comum

```bash
curl -X POST http://localhost:8080/server/cria_usuario \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "senha": "senha123",
    "tipo": "comum"
  }'
```

## 2. Criar Advogado

```bash
curl -X POST http://localhost:8080/server/cria_usuario \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Advogada",
    "email": "maria@exemplo.com",
    "senha": "senha123",
    "tipo": "advogado",
    "oab": "SP123456"
  }'
```

## 3. Criar Magistrado

```bash
curl -X POST http://localhost:8080/server/cria_usuario \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Dr. Carlos Juiz",
    "email": "carlos@exemplo.com",
    "senha": "senha123",
    "tipo": "magistrado",
    "cnj": "CNJ123456"
  }'
```

## 4. Login Tradicional

```bash
curl -X POST http://localhost:8080/server/entrar_usuario \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@exemplo.com",
    "senha": "senha123"
  }'
```

Resposta:
```json
{
  "user": {
    "id": "...",
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "tipo": "comum"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 5. Login com Google

Abra no navegador:
```
http://localhost:8080/server/auth/google
```

## 6. Ver Perfil (Autenticado)

```bash
curl -X GET http://localhost:8080/server/perfil \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 7. Atualizar Tipo de Usuário

```bash
curl -X PUT http://localhost:8080/server/atualizar_tipo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "tipo": "advogado",
    "oab": "SP789012"
  }'
```

## 8. Buscar Magistrado

```bash
curl -X POST http://localhost:8080/server/buscar_magistrado \
  -H "Content-Type: application/json" \
  -d '{
    "texto": "Silva"
  }'
```

## 9. Avaliar Magistrado (Autenticado)

```bash
curl -X POST http://localhost:8080/server/avaliar_magistrado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "nomeMagistrado": "Dr. José Silva",
    "idadeMagistrado": "50",
    "nota": 5,
    "comentario": "Excelente profissional, muito justo"
  }'
```

## 10. Ver Ranking de Magistrados

```bash
curl -X GET http://localhost:8080/server/ranking_magistrados
```

## 11. Ver Minhas Avaliações (Autenticado)

```bash
curl -X GET http://localhost:8080/server/usuario/minhas_avaliacoes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 12. Rota Específica de Advogado (Requer tipo = advogado)

```bash
curl -X GET http://localhost:8080/server/advogado/clientes \
  -H "Authorization: Bearer SEU_TOKEN_DE_ADVOGADO"
```

## 13. Rota Específica de Magistrado (Requer tipo = magistrado)

```bash
curl -X GET http://localhost:8080/server/magistrado/estatisticas \
  -H "Authorization: Bearer SEU_TOKEN_DE_MAGISTRADO"
```

## 14. Verificar Status de Autenticação

```bash
curl -X GET http://localhost:8080/server/auth/status \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 15. Ver Avaliações de um Magistrado Específico

```bash
curl -X GET http://localhost:8080/server/avaliacoes_magistrado/ID_DO_MAGISTRADO
```

## Testando no Postman

### Coleção de Exemplo

1. **Criar Nova Collection**: "MagiScore API"

2. **Variáveis de Ambiente**:
   - `baseUrl`: `http://localhost:8080/server`
   - `token`: (será preenchido após login)

3. **Requests**:

#### Login e Salvar Token
```javascript
// Na aba "Tests" do request de login:
var jsonData = pm.response.json();
pm.environment.set("token", jsonData.token);
```

#### Header Automático
```
Authorization: Bearer {{token}}
```

## Resposta de Erro 403 - Sem Permissão

```json
{
  "error": "Acesso negado. Você não tem permissão para acessar este recurso.",
  "requiredTypes": ["advogado"],
  "yourType": "comum"
}
```

## Resposta de Erro 401 - Não Autenticado

```json
{
  "error": "Não autenticado"
}
```
