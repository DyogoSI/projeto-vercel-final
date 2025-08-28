import { put } from '@vercel/blob';
import { Pool } from 'pg';

// Conexão com o banco de dados (não muda)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// A Vercel espera uma função exportada
export default async function handler(req, res) {
  try {
    // --- LÓGICA DE LISTAR (não muda) ---
    if (req.method === 'GET' && !req.query.id && !req.query.admin) {
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada, imagem_url FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    }
    if (req.method === 'GET' && req.query.id) {
      const { rows } = await pool.query("SELECT nome_aluno, turma, texto, imagem_url FROM cartinhas WHERE id = $1", [req.query.id]);
      return res.status(200).json(rows[0]);
    }
    
    // --- LÓGICA PARA CADASTRAR (COM A CORREÇÃO) ---
    if (req.method === 'POST') {
      const filename = req.headers['x-vercel-filename'];
      const { username, password, nome, turma, cartinha } = req.query; 
      
      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'senha123';

      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      // ***** A CORREÇÃO ESTÁ AQUI *****
      const blob = await put(filename, req, {
        access: 'public',
        addRandomSuffix: true // Adiciona um final aleatório ao nome do arquivo
      });
      
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      
      return res.status(201).send("Cartinha cadastrada com sucesso!");
    }
    
    // --- LÓGICA DE APADRINHAMENTO (não muda) ---
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

    // --- LÓGICA DE ADMIN (não muda) ---
    if (req.method === 'GET' && req.query.admin === 'true') {
        const { username, password } = req.headers;
        const USUARIO_VALIDO = 'admin';
        const SENHA_VALIDA = 'senha123';
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
    
    return res.status(405).end();

  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).send("Erro interno no servidor.");
  }
}

// Configuração para a Vercel entender que o corpo da requisição é um arquivo
export const config = {
  api: {
    bodyParser: false,
  },
};