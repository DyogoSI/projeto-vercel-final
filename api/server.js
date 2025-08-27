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
       if (!req.query.id && !req.query.admin) {
          const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada, imagem_url FROM cartinhas ORDER BY id");
          return res.status(200).json(rows);
        }
        if (req.query.id) {
          const { rows } = await pool.query("SELECT nome_aluno, turma, texto, imagem_url FROM cartinhas WHERE id = $1", [req.query.id]);
          return res.status(200).json(rows[0]);
        }
        // ... (código existente do GET para o admin) ...
    }

    // --- LÓGICA PARA CADASTRAR (CORRIGIDA) ---
    if (req.method === 'POST') {
      const filename = req.headers['x-vercel-filename'];

      // ***** A CORREÇÃO ESTÁ AQUI *****
      // Agora lemos os dados de req.query (a URL) em vez de req.body
      const { username, password, nome, turma, cartinha } = req.query; 

      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'senha123';

      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      const blob = await put(filename, req, { access: 'public' });

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