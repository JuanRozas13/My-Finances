-- ============================================
-- SCHEMA MySQL - Financeiro App
-- ============================================

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS financeiro_db;
USE financeiro_db;

-- ============================================
-- TABELAS COM BOAS PRÁTICAS
-- ============================================

-- 1. TABELA: usuarios (para futuro - multi-usuário)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA: categorias_despesa (para gerenciar as categorias)
CREATE TABLE IF NOT EXISTS categorias_despesa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cor_hex VARCHAR(7) NOT NULL DEFAULT '#000000',
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_categoria (usuario_id, nome),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA: despesas (principal)
CREATE TABLE IF NOT EXISTS despesas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
    data_despesa DATE NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias_despesa(id) ON DELETE RESTRICT,
    INDEX idx_usuario (usuario_id),
    INDEX idx_categoria (categoria_id),
    INDEX idx_data (data_despesa),
    INDEX idx_usuario_data (usuario_id, data_despesa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA: orçamentos (opcional - controle mensal)
CREATE TABLE IF NOT EXISTS orcamentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    limite_mensal DECIMAL(10, 2) NOT NULL,
    mes_ano VARCHAR(7) NOT NULL, -- YYYY-MM
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_orcamento (usuario_id, categoria_id, mes_ano),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias_despesa(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DADOS DE EXEMPLO
-- ============================================

-- Inserir usuário padrão
INSERT INTO usuarios (nome, email, senha) VALUES 
('Seu Nome', 'usuario@email.com', 'senha123');

-- Inserir categorias padrão
INSERT INTO categorias_despesa (usuario_id, nome, cor_hex) VALUES 
(1, 'Cartão Inter', '#ff5722'),
(1, 'Cartão Nubank', '#9c27b0'),
(1, 'Cartão Renner', '#00bcd4'),
(1, 'Conta de Luz', '#ffc107'),
(1, 'Conta de Água', '#2196f3'),
(1, 'Internet', '#4caf50'),
(1, 'Alimentação', '#f97316');

-- Inserir despesas de exemplo
INSERT INTO despesas (usuario_id, categoria_id, descricao, valor, data_despesa) VALUES 
(1, 1, 'Compras diversas', 250.00, '2026-06-05'),
(1, 2, 'Alimentação no supermercado', 350.00, '2026-06-10'),
(1, 3, 'Compras de roupas', 200.00, '2026-06-08'),
(1, 4, 'Conta de luz - junho', 150.00, '2026-06-01'),
(1, 5, 'Conta de água - junho', 80.00, '2026-06-02'),
(1, 6, 'Mensalidade internet', 100.00, '2026-06-03');

-- ============================================
-- QUERIES ÚTEIS
-- ============================================

-- Ver todas as despesas com nome da categoria
-- SELECT 
--     d.id,
--     d.descricao,
--     c.nome as categoria,
--     d.valor,
--     d.data_despesa,
--     d.data_criacao
-- FROM despesas d
-- JOIN categorias_despesa c ON d.categoria_id = c.id
-- WHERE d.usuario_id = 1
-- ORDER BY d.data_despesa DESC;

-- Resumo por categoria (mês atual)
-- SELECT 
--     c.nome,
--     c.cor_hex,
--     SUM(d.valor) as total,
--     COUNT(d.id) as quantidade
-- FROM despesas d
-- JOIN categorias_despesa c ON d.categoria_id = c.id
-- WHERE d.usuario_id = 1 
--     AND YEAR(d.data_despesa) = 2026
--     AND MONTH(d.data_despesa) = 6
-- GROUP BY c.id, c.nome, c.cor_hex
-- ORDER BY total DESC;