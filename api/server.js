import { put } from '@vercel/blob';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // --- LÓGICA DE LISTAR (não muda) ---
    if (req.method === 'GET') {
      // ... (código existente para GET requests) ...
    }
    
    // --- LÓGICA PARA CADASTRAR / EDITAR ---
    if (req.method === 'POST') {
      const { action } = req.query;
      const { username, password } = req.body;

      // Autenticação
      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'senha123';
      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      // --- LÓGICA PARA EDITAR CARTINHA (NOVO) ---
      if (action === 'edit' && req.query.id) {
        const { nome, turma } = req.body;
        await pool.query(
          "UPDATE cartinhas SET nome_aluno = $1, turma = $2 WHERE id = $3",
          [nome, turma, req.query.id]
        );
        return res.status(200).send("Cartinha atualizada!");
      }

      // --- LÓGICA PARA CADASTRAR NOVA CARTINHA (com upload) ---
      const filename = req.headers['x-vercel-filename'];
      const { nome, turma, cartinha } = req.query;
      
      const blob = await put(filename, req, { access: 'public', addRandomSuffix: true });
      
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      
      return res.status(201).send("Cartinha cadastrada com sucesso!");
    }
    
    // --- LÓGICA DE APADRINHAMENTO (não muda) ---
    if (req.method === 'PUT') {
        // ... (código existente para apadrinhar) ...
    }
    
    // --- LÓGICA PARA EXCLUIR CARTINHA (NOVO) ---
    if (req.method === 'DELETE' && req.query.id) {
        const { username, password } = req.headers;
        const USUARIO_VALIDO = 'admin';
        const SENHA_VALIDA = 'senha123';
        if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
          return res.status(401).send("Acesso não autorizado.");
        }
        await pool.query("DELETE FROM cartinhas WHERE id = $1", [req.query.id]);
        return res.status(200).send("Cartinha excluída com sucesso!");
    }

    // --- LÓGICA DE ADMIN (não muda) ---
    if (req.method === 'GET' && req.query.admin === 'true') {
        // ... (código existente para buscar dados dos padrinhos) ...
    }
    
    return res.status(405).end();
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