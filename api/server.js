const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && !req.query.id && !req.query.admin) {
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    }
    if (req.method === 'GET' && req.query.id) {
      const { rows } = await pool.query("SELECT nome_aluno, turma, texto FROM cartinhas WHERE id = $1", [req.query.id]);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'POST') {
      const { nome, turma, cartinha, username, password } = req.body;
      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'senha123';
      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto) VALUES ($1, $2, $3)",
        [nome, turma, cartinha]
      );
      return res.status(201).send("Cartinha cadastrada!");
    }
    if (req.method === 'PUT' && req.query.id) {
      const { nome, telefone, endereco } = req.body;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("UPDATE cartinhas SET apadrinhada = TRUE WHERE id = $1", [req.query.id]);
        await client.query(
          "INSERT INTO padrinhos (cartinha_id, nome_padrinho, telefone_padrinho, endereco_entrega) VALUES ($1, $2, $3, $4)",
          [req.query.id, nome, telefone, endereco]
        );
        await client.query('COMMIT');
        return res.status(200).send("Apadrinhamento confirmado!");
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    if (req.method === 'GET' && req.query.admin === 'true') {
      const { username, password } = req.headers;
      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'administrador30';
      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Acesso não autorizado.");
      }
      const { rows } = await pool.query(`
        SELECT c.nome_aluno, c.turma, p.nome_padrinho, p.telefone_padrinho, p.endereco_entrega
        FROM cartinhas c JOIN padrinhos p ON c.id = p.cartinha_id
        WHERE c.apadrinhada = TRUE ORDER BY c.id;
      `);
      return res.status(200).json(rows);
    }
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Erro interno no servidor.");
  }
}