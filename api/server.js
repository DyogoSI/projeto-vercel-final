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
    const { id, admin, action, username, password, nome, turma, texto, cartinha } = req.query;
    const authUser = getCaseInsensitiveHeader(req.headers, 'username') || req.body.username || username;
    const authPass = getCaseInsensitiveHeader(req.headers, 'password') || req.body.password || password;
    const USUARIO_VALIDO = 'admin';
    const SENHA_VALIDA = 'administrador30';

    // --- LÓGICA DE GET (Listar) ---
    if (req.method === 'GET') {
      if (admin === 'true') {
        if (authUser !== USUARIO_VALIDO || authPass !== SENHA_VALIDA) {
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
    }
    
    // --- LÓGICA DE POST (Cadastrar / Editar) ---
    if (req.method === 'POST') {
      if (authUser !== USUARIO_VALIDO || authPass !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }
      if (action === 'edit' && id) {
        const { nome: nomeBody, turma: turmaBody, texto: textoBody } = req.body;
        await pool.query(
          "UPDATE cartinhas SET nome_aluno = $1, turma = $2, texto = $3 WHERE id = $4",
          [nomeBody, turmaBody, textoBody, id]
        );
        return res.status(200).send("Cartinha atualizada!");
      }
      const filename = getCaseInsensitiveHeader(req.headers, 'x-vercel-filename');
      if (!filename) return res.status(400).send("Nenhum arquivo enviado.");
      const blob = await put(filename, req, { access: 'public', addRandomSuffix: true });
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      return res.status(201).send("Cartinha cadastrada!");
    }
    
    // --- LÓGICA DE PUT (Apadrinhar) ---
    if (req.method === 'PUT' && id) {
      const { nome: nomePadrinho, telefone, endereco } = req.body;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("UPDATE cartinhas SET apadrinhada = TRUE WHERE id = $1", [id]);
        await client.query("INSERT INTO padrinhos (cartinha_id, nome_padrinho, telefone_padrinho, endereco_entrega) VALUES ($1, $2, $3, $4)", [id, nomePadrinho, telefone, endereco]);
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
    if (req.method === 'DELETE' && id) {
      if (authUser !== USUARIO_VALIDO || authPass !== SENHA_VALIDA) {
        return res.status(401).send("Acesso não autorizado.");
      }
      await pool.query("DELETE FROM cartinhas WHERE id = $1", [id]);
      return res.status(200).send("Cartinha excluída!");
    }
    
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
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