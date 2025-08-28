import { put } from '@vercel/blob';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// Função de utilidade para ler headers sem se preocupar com maiúsculas/minúsculas
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
    // --- LÓGICAS DE GET (Listar cartinhas) ---
    if (req.method === 'GET') {
      // Admin vendo os padrinhos (COM A CORREÇÃO)
      if (req.query.admin === 'true') {
        const username = getCaseInsensitiveHeader(req.headers, 'username');
        const password = getCaseInsensitiveHeader(req.headers, 'password');
        const USUARIO_VALIDO = 'admin';
        const SENHA_VALIDA = 'senha123';

        if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
          return res.status(401).send("Acesso não autorizado.");
        }

        const { rows } = await pool.query(`
            SELECT c.id, c.nome_aluno, c.turma, p.nome_padrinho, p.telefone_padrinho, p.endereco_entrega
            FROM cartinhas c JOIN padrinhos p ON c.id = p.cartinha_id
            WHERE c.apadrinhada = TRUE ORDER BY c.id;
        `);
        return res.status(200).json(rows);
      }
      // Listar UMA cartinha
      if (req.query.id) {
        const { rows } = await pool.query("SELECT nome_aluno, turma, texto, imagem_url FROM cartinhas WHERE id = $1", [req.query.id]);
        return res.status(200).json(rows[0]);
      }
      // Listar TODAS as cartinhas
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada, imagem_url FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    }
    
    // --- LÓGICA DE POST (Cadastrar / Editar) ---
    if (req.method === 'POST') {
      const { action } = req.query;
      // Para upload, os dados vêm da URL; para editar, vêm do corpo
      const authUser = req.query.username || req.body.username;
      const authPass = req.query.password || req.body.password;
      
      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'senha123';
      if (authUser !== USUARIO_VALIDO || authPass !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      // Editar cartinha
      if (action === 'edit' && req.query.id) {
        const { nome, turma } = req.body;
        await pool.query("UPDATE cartinhas SET nome_aluno = $1, turma = $2 WHERE id = $3", [nome, turma, req.query.id]);
        return res.status(200).send("Cartinha atualizada!");
      }

      // Cadastrar nova cartinha com upload
      const filename = getCaseInsensitiveHeader(req.headers, 'x-vercel-filename');
      const { nome, turma, cartinha } = req.query;
      const blob = await put(filename, req, { access: 'public', addRandomSuffix: true });
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      return res.status(201).send("Cartinha cadastrada!");
    }
    
    // --- LÓGICA DE PUT (Apadrinhar) ---
    if (req.method === 'PUT' && req.query.id) {
        const { nome, telefone, endereco } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("UPDATE cartinhas SET apadrinhada = TRUE WHERE id = $1", [req.query.id]);
            await client.query("INSERT INTO padrinhos (cartinha_id, nome_padrinho, telefone_padrinho, endereco_entrega) VALUES ($1, $2, $3, $4)", [req.query.id, nome, telefone, endereco]);
            await client.query('COMMIT');
            return res.status(200).send("Apadrinhamento confirmado!");
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
    
    // --- LÓGICA DE DELETE (Excluir) ---
    if (req.method === 'DELETE' && req.query.id) {
        const username = getCaseInsensitiveHeader(req.headers, 'username');
        const password = getCaseInsensitiveHeader(req.headers, 'password');
        const USUARIO_VALIDO = 'admin';
        const SENHA_VALIDA = 'senha123';
        if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
          return res.status(401).send("Acesso não autorizado.");
        }
        await pool.query("DELETE FROM cartinhas WHERE id = $1", [req.query.id]);
        return res.status(200).send("Cartinha excluída!");
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