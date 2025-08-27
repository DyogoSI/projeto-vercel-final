import { put } from '@vercel/blob';
import { Pool } from 'pg';

// Conexão com o banco (não muda)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// A Vercel espera uma função exportada
export default async function handler(req, res) {
  try {
    // --- LÓGICA PARA LISTAR TODAS AS CARTINHAS ---
    if (req.method === 'GET' && !req.query.id && !req.query.admin) {
      const { rows } = await pool.query("SELECT id, nome_aluno, turma, apadrinhada, imagem_url FROM cartinhas ORDER BY id");
      return res.status(200).json(rows);
    }
    
    // --- LÓGICA PARA LISTAR UMA CARTINHA (agora com imagem) ---
    if (req.method === 'GET' && req.query.id) {
      const { rows } = await pool.query("SELECT nome_aluno, turma, texto, imagem_url FROM cartinhas WHERE id = $1", [req.query.id]);
      return res.status(200).json(rows[0]);
    }
    
    // --- LÓGICA PARA CADASTRAR (com upload de imagem) ---
    if (req.method === 'POST') {
      // O nome do arquivo da imagem vem no header da requisição
      const filename = req.headers['x-vercel-filename'];
      const { username, password, nome, turma, cartinha } = req.body;
      
      const USUARIO_VALIDO = 'admin';
      const SENHA_VALIDA = 'senha123';

      if (username !== USUARIO_VALIDO || password !== SENHA_VALIDA) {
        return res.status(401).send("Usuário ou senha inválidos.");
      }

      // Faz o upload da imagem para o Vercel Blob
      const blob = await put(filename, req, { access: 'public' });
      
      // Salva a URL da imagem no banco de dados junto com os outros dados
      await pool.query(
        "INSERT INTO cartinhas (nome_aluno, turma, texto, imagem_url) VALUES ($1, $2, $3, $4)",
        [nome, turma, cartinha, blob.url]
      );
      
      return res.status(201).send("Cartinha cadastrada com sucesso!");
    }
    
    // --- LÓGICA DE APADRINHAMENTO (não muda) ---
    if (req.method === 'PUT' && req.query.id) {
        // ... (código existente para apadrinhar e salvar dados do padrinho) ...
    }

    // --- LÓGICA DE ADMIN (não muda) ---
    if (req.method === 'GET' && req.query.admin === 'true') {
        // ... (código existente para buscar dados dos padrinhos) ...
    }
    
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).send("Erro interno no servidor.");
  }
}

// Configuração para a Vercel entender que o corpo da requisição é um stream (arquivo)
export const config = {
  api: {
    bodyParser: false,
  },
};