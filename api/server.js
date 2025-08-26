// Importa o pacote do PostgreSQL
const { Pool } = require('pg');

// Configura a conexão com o banco de dados usando a variável de ambiente da Vercel
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// A Vercel espera uma função exportada como padrão, que lida com o request e response
export default async function handler(req, res) {
  try {
    // --- LÓGICA PARA LISTAR TODAS AS CARTINHAS ---
    if (req.method === 'GET' && !req.query.id) {
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    }
    
    // --- LÓGICA PARA LISTAR UMA CARTINHA ESPECÍFICA ---
    if (req.method === 'GET' && req.query.id) {
      const { rows } = await pool.query("SELECT nome_aluno, turma, texto FROM cartinhas WHERE id = $1", [req.query.id]);
      return res.status(200).json(rows[0]);
    }
    
    // --- LÓGICA PARA CADASTRAR UMA NOVA CARTINHA ---
    if (req.method === 'POST') {
      const { nome, turma, cartinha } = req.body;
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto) VALUES ($1, $2, $3)",
        [nome, turma, cartinha]
      );
      return res.status(201).send("Cartinha cadastrada!");
    }
    
    // --- LÓGICA PARA APADRINHAR UMA CARTINHA ---
    if (req.method === 'PUT' && req.query.id) {
        await pool.query("UPDATE cartinhas SET apadrinhada = TRUE WHERE id = $1", [req.query.id]);
        return res.status(200).send("Apadrinhamento confirmado!");
    }
    
    // Se o método da requisição não for nenhum dos acima
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error(error);
    return res.status(500).send("Erro interno no servidor.");
  }
}