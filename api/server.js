import { put } from '@vercel/blob';
import { Pool } from 'pg';
import { json } from 'express';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const jsonParser = json();

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
  const { id, admin } = req.query;
  const USUARIO_VALIDO = 'admin';
  const SENHA_VALIDA = 'senha123';

  // --- LÓGICA DE GET (Listar) ---
  if (req.method === 'GET') {
    try {
      if (admin === 'true') {
        const username = getCaseInsensitiveHeader(req.headers, 'username');
        const password = getCaseInsensitiveHeader(req.headers, 'password');
        if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
          return res.status(401).send("Acesso não autorizado.");
        }
        const { rows } = await pool.query(`
          SELECT c.id, c.nome_aluno, c.turma, c.texto, c.apadrinhada, p.nome_padrinho, p.telefone_padrinho, p.endereco_entrega
          FROM cartinhas c LEFT JOIN padrinhos p ON c.id = p.cartinha_id
          ORDER BY c.id;
        `);
        return res.status(200).json(rows);
      }
      if (id) {
        const { rows } = await pool.query("SELECT nome_aluno, turma, texto, imagem_url FROM cartinhas WHERE id = $1", [id]);
        return res.status(200).json(rows[0]);
      }
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada, imagem_url FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Erro no GET:', error);
      return res.status(500).send("Erro interno no servidor.");
    }
  }

  // --- LÓGICA DE PUT (Apadrinhar) ---
  if (req.method === 'PUT' && id) {
    jsonParser(req, res, async () => {
      try {
        const { nome, telefone, endereco } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("UPDATE cartinhas SET apadrinhada = TRUE WHERE id = $1", [id]);
            await client.query("INSERT INTO padrinhos (cartinha_id, nome_padrinho, telefone_padrinho, endereco_entrega) VALUES ($1, $2, $3, $4)", [id, nome, telefone, endereco]);
            await client.query('COMMIT');
            return res.status(200).send("Apadrinhamento confirmado!");
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
      } catch (error) {
        console.error('Erro no PUT:', error);
        return res.status(500).send("Erro interno no servidor.");
      }
    });
    return;
  }
  
  // --- LÓGICA DE POST (Cadastrar) ---
  if (req.method === 'POST') {
    try {
      const { username, password, nome, turma, cartinha } = req.query;
      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }
      const filename = getCaseInsensitiveHeader(req.headers, 'x-vercel-filename');
      if (!filename) return res.status(400).send("Nenhum arquivo enviado.");
      const blob = await put(filename, req, { access: 'public', addRandomSuffix: true });
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      return res.status(201).send("Cartinha cadastrada!");
    } catch (error) {
      console.error('Erro no POST (upload):', error);
      return res.status(500).send("Erro interno no servidor.");
    }
  }
    
  return res.status(405).send(`Method ${req.method} Not Allowed`);
}

export const config = {
  api: {
    bodyParser: false,
  },
};