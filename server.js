// ============================================
// server.js - Servidor Express com MySQL
// ============================================

import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ============================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'dba',
  password: process.env.DB_PASSWORD || 'Mint2836',
  database: process.env.DB_NAME || 'financeiro_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const USER_ID = Number(process.env.USER_ID || 1);
const PAYMENT_METHODS = new Set(['pix', 'debito', 'credito']);
const DEFAULT_CATEGORY_COLOR = '#3b82f6';

// ============================================
// ROTAS: DESPESAS
// ============================================

// GET: Trazer todas as despesas do usuário
app.get('/api/despesas', async (req, res) => {
  try {
    const { ano, mes } = req.query;

    let query = `
      SELECT 
        d.id,
        d.descricao,
        d.valor,
        d.data_despesa,
        d.observacoes,
        d.pay,
        c.id as categoria_id,
        c.nome as categoria,
        c.cor_hex
      FROM despesas d
      JOIN categorias_despesa c ON d.categoria_id = c.id
      WHERE d.usuario_id = ? AND d.ativo = TRUE
    `;

    const params = [USER_ID];

    // Filtrar por mês e ano se fornecido
    if (ano && mes) {
      query += ` AND YEAR(d.data_despesa) = ? AND MONTH(d.data_despesa) = ?`;
      params.push(ano, mes);
    }

    query += ` ORDER BY d.data_despesa DESC`;

    const [despesas] = await pool.execute(query, params);

    res.json(despesas);
  } catch (error) {
    console.error('Erro ao buscar despesas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Adicionar nova despesa
app.post('/api/despesas', async (req, res) => {
  try {
    const { descricao, categoria_id, valor, data_despesa, observacoes, pay } = req.body;

    // Validações
    if (!descricao || !categoria_id || !valor || !data_despesa || !pay) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    if (valor <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que 0' });
    }

    if (!PAYMENT_METHODS.has(pay)) {
      return res.status(400).json({ error: 'Método de pagamento inválido' });
    }

    const [result] = await pool.execute(
      `INSERT INTO despesas (usuario_id, categoria_id, descricao, valor, data_despesa, pay, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [USER_ID, categoria_id, descricao, valor, data_despesa, pay, observacoes || null]
    );

    res.status(201).json({
      id: result.insertId,
      descricao,
      categoria_id,
      valor,
      data_despesa,
      pay,
      observacoes
    });
  } catch (error) {
    console.error('Erro ao adicionar despesa:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Remover despesa
app.delete('/api/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Usar soft delete (marcar como inativo)
    await pool.execute(
      `UPDATE despesas SET ativo = FALSE WHERE id = ? AND usuario_id = ?`,
      [id, USER_ID]
    );

    res.json({ success: true, message: 'Despesa removida' });
  } catch (error) {
    console.error('Erro ao remover despesa:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT: Atualizar despesa
app.put('/api/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, categoria_id, valor, data_despesa, observacoes, pay } = req.body;

    if (pay && !PAYMENT_METHODS.has(pay)) {
      return res.status(400).json({ error: 'Método de pagamento inválido' });
    }

    await pool.execute(
      `UPDATE despesas 
       SET descricao = ?, categoria_id = ?, valor = ?, data_despesa = ?, pay = ?, observacoes = ?
       WHERE id = ? AND usuario_id = ?`,
      [descricao, categoria_id, valor, data_despesa, pay || 'pix', observacoes, id, USER_ID]
    );

    res.json({ success: true, message: 'Despesa atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS: CATEGORIAS
// ============================================

// GET: Trazer todas as categorias
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.execute(
      `SELECT id, nome, cor_hex FROM categorias_despesa 
       WHERE usuario_id = ? AND ativo = TRUE 
       ORDER BY nome`,
      [USER_ID]
    );

    res.json(categorias);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Criar nova categoria
app.post('/api/categorias', async (req, res) => {
  try {
    const { nome, cor_hex } = req.body;
    const categoryName = nome?.trim();
    const color = cor_hex || DEFAULT_CATEGORY_COLOR;

    if (!categoryName) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Cor da categoria inválida' });
    }

    const [result] = await pool.execute(
      `INSERT INTO categorias_despesa (usuario_id, nome, cor_hex)
       VALUES (?, ?, ?)`,
      [USER_ID, categoryName, color]
    );

    res.status(201).json({
      id: result.insertId,
      nome: categoryName,
      cor_hex: color
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Categoria já existe' });
    }

    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTAS: RESUMO E RELATÓRIOS
// ============================================

// GET: Resumo por categoria (mês específico)
app.get('/api/resumo', async (req, res) => {
  try {
    const { ano, mes } = req.query;

    if (!ano || !mes) {
      return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
    }

    const [resumo] = await pool.execute(
      `SELECT 
        c.id,
        c.nome,
        c.cor_hex,
        SUM(d.valor) as valor_total,
        COUNT(d.id) as quantidade
      FROM despesas d
      JOIN categorias_despesa c ON d.categoria_id = c.id
      WHERE d.usuario_id = ? 
        AND d.ativo = TRUE
        AND YEAR(d.data_despesa) = ? 
        AND MONTH(d.data_despesa) = ?
      GROUP BY c.id, c.nome, c.cor_hex
      ORDER BY valor_total DESC`,
      [USER_ID, ano, mes]
    );

    const totalMes = resumo.reduce((sum, cat) => sum + parseFloat(cat.valor_total), 0);

    res.json({
      categoria: resumo,
      total_mes: totalMes,
      mes: `${ano}-${mes}`
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Banco configurado: ${process.env.DB_NAME || 'financeiro_db'}`);
});
