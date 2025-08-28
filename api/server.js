import { put } from '@vercel/blob';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

function getCaseInsensitiveHeader(headers, key) {
  if (!headers) return undefined;
  const lowerKey = key.toLowerCase();
  for (const headerKey in headers) {
    if (headerKey.toLowerCase() === lowerKey) {
      return headers[headerKey];
    }
  }
  return undefined;
}

export default async function handler(req, res) {
  try {
    const { id, admin, action, username, password, nome, turma, texto, cartinha } = req.query;
    const authUserFromBody = req.body ? req.body.username : undefined;
    const authPassFromBody = req.body ? req.body.password : undefined;

    const authUser = getCaseInsensitiveHeader(req.headers, 'username') || authUserFromBody || username;
    const authPass = getCaseInsensitiveHeader(req.headers, 'password') || authPassFromBody || password;
    const USUARIO_VALIDO = 'admin';
    const SENHA_VALIDA = 'senha123';

    // --- LÓGICA DE GET (Não muda) ---
    if (req.method === 'GET') {
      // ... (código existente para GET) ...
    }
    
    // --- LÓGICA DE POST (Cadastrar / Editar) ---
    if (req.method === 'POST') {
      if (authUser !== USUARIO_VALIDO || authPass !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      // Editar cartinha (LÓGICA CORRIGIDA)
      if (action === 'edit' && id) {
        await pool.query(
          "UPDATE cartinhas SET nome_aluno = $1, turma = $2, texto = $3 WHERE id = $4",
          [nome, turma, texto, id] // Pega nome, turma, e texto da req.query
        );
        return res.status(200).send("Cartinha atualizada!");
      }

      // Cadastrar nova cartinha com upload
      const filename = getCaseInsensitiveHeader(req.headers, 'x-vercel-filename');
      if (!filename) return res.status(400).send("Nenhum arquivo enviado.");
      
      const blob = await put(filename, req, { access: 'public', addRandomSuffix: true });
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      return res.status(201).send("Cartinha cadastrada!");
    }
    
    // --- LÓGICA DE PUT e DELETE (Não mudam) ---
    if (req.method === 'PUT' && id) { /* ... código existente ... */ }
    if (req.method === 'DELETE' && id) { /* ... código existente ... */ }
    
    return res.status(405).send(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).send("Erro interno no servidor.");
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};