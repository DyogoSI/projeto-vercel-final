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
    const { id, admin, action, username, password, nome, turma, texto, cartinha, telefone, endereco } = req.query;
    const authUser = getCaseInsensitiveHeader(req.headers, 'username') || req.body.username || username;
    const authPass = getCaseInsensitiveHeader(req.headers, 'password') || req.body.password || password;
    const USUARIO_VALIDO = 'admin';
    const SENHA_VALIDA = 'senha123';

    // --- LÓGICA DE GET (Não muda) ---
    if (req.method === 'GET') {
      // (código existente para GET)
    }
    
    // --- LÓGICA DE POST (Não muda) ---
    if (req.method === 'POST') {
      // (código existente para POST)
    }
    
    // --- LÓGICA DE PUT (Apadrinhar - CORRIGIDO) ---
    if (req.method === 'PUT' && id) {
        // Agora, os dados do padrinho são lidos da req.query (URL)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("UPDATE cartinhas SET apadrinhada = TRUE WHERE id = $1", [id]);
            await client.query(
                "INSERT INTO padrinhos (cartinha_id, nome_padrinho, telefone_padrinho, endereco_entrega) VALUES ($1, $2, $3, $4)",
                [id, nome, telefone, endereco] // Usando as variáveis da req.query
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
    
    // --- LÓGICA DE DELETE (Não muda) ---
    if (req.method === 'DELETE' && id) {
      // (código existente para DELETE)
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