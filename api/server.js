import { put } from '@vercel/blob';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

function getCaseInsensitiveHeader(headers, key) {
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
    // --- LÓGICA DE GET (Não muda) ---
    if (req.method === 'GET') {
      if (req.query.admin === 'true') {
        const username = getCaseInsensitiveHeader(req.headers, 'username');
        const password = getCaseInsensitiveHeader(req.headers, 'password');
        if (username !== 'admin' || password !== 'senha123') {
          return res.status(401).send("Acesso não autorizado.");
        }
        const { rows } = await pool.query(`
          SELECT c.id, c.nome_aluno, c.turma, c.texto, c.apadrinhada, p.nome_padrinho, p.telefone_padrinho, p.endereco_entrega
          FROM cartinhas c LEFT JOIN padrinhos p ON c.id = p.cartinha_id
          ORDER BY c.id;
        `);
        return res.status(200).json(rows);
      }
      if (req.query.id) {
        const { rows } = await pool.query("SELECT nome_aluno, turma, texto, imagem_url FROM cartinhas WHERE id = $1", [req.query.id]);
        return res.status(200).json(rows[0]);
      }
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada, imagem_url FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    }
    
    // --- LÓGICA DE POST (Cadastrar / Editar) ---
    if (req.method === 'POST') {
      const { action, id, username, password, nome, turma, texto, cartinha } = req.query;
      
      if (username !== 'admin' || password !== 'senha123') {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      // Editar cartinha (LÓGICA CORRIGIDA)
      if (action === 'edit' && id) {
        await pool.query(
          "UPDATE cartinhas SET nome_aluno = $1, turma = $2, texto = $3 WHERE id = $4",
          [nome, turma, texto, id]
        );
        return res.status(200).send("Cartinha atualizada!");
      }

      // Cadastrar nova cartinha com upload
      const filename = getCaseInsensitiveHeader(req.headers, 'x-vercel-filename');
      if (!filename) {
        return res.status(400).send("Nenhum arquivo enviado.");
      }
      const blob = await put(filename, req, { access: 'public', addRandomSuffix: true });
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      return res.status(201).send("Cartinha cadastrada!");
    }
    
    // --- LÓGICA DE PUT (Apadrinhar - Não muda) ---
    if (req.method === 'PUT' && req.query.id) {
        // ... (código existente) ...
    }
    
    // --- LÓGICA DE DELETE (Não muda) ---
    if (req.method === 'DELETE' && req.query.id) {
        // ... (código existente) ...
    }
    
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