// ============================================
// App.jsx COM CONEXÃO AO SERVIDOR MYSQL
// ============================================

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trash2, Plus, Loader } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

export default function FinancialDashboard() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

  const [expenses, setExpenses] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCat, setLoadingCat] = useState(true);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [formData, setFormData] = useState({
    descricao: '',
    categoria_id: '',
    pay: '',
    valor: '',
    data_despesa: currentDate.toISOString().split('T')[0],
  });
  const [newCategory, setNewCategory] = useState({
    nome: '',
    cor_hex: '#3b82f6',
  });

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // ============================================
  // CARREGAR CATEGORIAS (ao iniciar)
  // ============================================
  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setLoadingCat(true);
      const res = await fetch(`${API_BASE}/categorias`);
      if (!res.ok) throw new Error('Erro ao buscar categorias');
      const data = await res.json();
      setCategorias(data);
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao carregar categorias');
    } finally {
      setLoadingCat(false);
    }
  };

  const getPaymentLabel = (value) => {
    return PAYMENT_METHOD_OPTIONS.find(method => method.value === value)?.label || value;
  };

  const handleCreateCategory = async () => {
    const categoryName = newCategory.nome.trim();

    if (!categoryName) {
      alert('⚠️ Informe o nome da categoria');
      return;
    }

    try {
      setCreatingCategory(true);
      const res = await fetch(API_BASE + '/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: categoryName,
          cor_hex: newCategory.cor_hex,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar categoria');

      setCategorias(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFormData(prev => ({ ...prev, categoria_id: String(data.id) }));
      setNewCategory({ nome: '', cor_hex: '#3b82f6' });
      alert('✅ Categoria criada com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ ' + error.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  // ============================================
  // CARREGAR DESPESAS (quando mudar mês/ano)
  // ============================================
  useEffect(() => {
    fetchExpenses();
  }, [selectedYear, selectedMonth]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/despesas?ano=${selectedYear}&mes=${selectedMonth}`
      );
      if (!res.ok) throw new Error('Erro ao buscar despesas');
      const data = await res.json();
      setExpenses(data);
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADICIONAR DESPESA
  // ============================================
  const handleAddExpense = async () => {
    if (!formData.descricao.trim() || !formData.categoria_id || !formData.valor || !formData.pay) {
      alert('⚠️ Preencha todos os campos corretamente');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(API_BASE + '/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: formData.descricao,
          categoria_id: parseInt(formData.categoria_id),
          pay: formData.pay,
          valor: parseFloat(formData.valor),
          data_despesa: formData.data_despesa,
        })
      });

      if (!res.ok) throw new Error('Erro ao adicionar despesa');
      
      alert('✅ Despesa adicionada com sucesso!');
      setFormData({
        descricao: '',
        categoria_id: '',
        pay: '',
        valor: '',
        data_despesa: new Date().toISOString().split('T')[0],
      });

      // Recarregar despesas
      await fetchExpenses();
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao adicionar despesa');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // REMOVER DESPESA
  // ============================================
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta despesa?')) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/despesas/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erro ao remover despesa');
      
      alert('✅ Despesa removida!');
      await fetchExpenses();
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao remover despesa');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PROCESSAR DADOS PARA GRÁFICOS
  // ============================================
  
  const categoryMap = {};
  categorias.forEach(cat => {
    categoryMap[cat.id] = cat;
  });

  const categoryData = categorias.map(cat => ({
    id: cat.id,
    name: cat.nome,
    value: expenses
      .filter(exp => exp.categoria_id === cat.id)
      .reduce((sum, exp) => sum + parseFloat(exp.valor), 0)
  })).filter(item => item.value > 0);

  const totalMonth = expenses.reduce((sum, exp) => sum + parseFloat(exp.valor), 0);

  const trendData = (() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1 - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      data.push({ 
        month: months[d.getMonth()], 
        total: 0 // Aqui você poderia chamar a API para cada mês
      });
    }
    return data;
  })();

  const categoryPercentage = (catId) => {
    if (totalMonth === 0) return 0;
    const catValue = categoryData.find(c => c.id === catId)?.value || 0;
    return (catValue / totalMonth * 100).toFixed(1);
  };

  const COLORS = {};
  categorias.forEach(cat => {
    COLORS[cat.id] = cat.cor_hex;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">💰 Suas Finanças</h1>
          <p className="text-slate-400">Acompanhe e controle suas despesas</p>
          <p className="text-xs text-green-400 mt-2">✅ Dados salvos em banco de dados MySQL</p>
        </div>

        {loadingCat ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="animate-spin text-blue-500" size={40} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Formulário */}
              <div className="lg:col-span-1 bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">✏️ Adicionar Despesa</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Descrição *</label>
                    <input
                      type="text"
                      placeholder="ex: Compras, Alimentação"
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      disabled={loading}
                      className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Categoria *</label>
                    <select
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                      disabled={loading}
                      className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Criar Categoria</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ex: Transporte"
                        value={newCategory.nome}
                        onChange={(e) => setNewCategory({...newCategory, nome: e.target.value})}
                        disabled={creatingCategory}
                        className="min-w-0 flex-1 bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                      />
                      <input
                        type="color"
                        value={newCategory.cor_hex}
                        onChange={(e) => setNewCategory({...newCategory, cor_hex: e.target.value})}
                        disabled={creatingCategory}
                        className="h-10 w-12 rounded border border-slate-600 bg-slate-700 disabled:opacity-50"
                        title="Cor da categoria"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={creatingCategory}
                        className="h-10 w-10 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition disabled:opacity-50"
                        title="Criar categoria"
                      >
                        {creatingCategory ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Método de Pagamento *</label>
                    <select
                      value={formData.pay}
                      onChange={(e) => setFormData({...formData, pay: e.target.value})}
                      disabled={loading}
                      className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Selecione o método</option>
                      {PAYMENT_METHOD_OPTIONS.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Valor (R$) *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                      disabled={loading}
                      className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Data *</label>
                    <input
                      type="date"
                      value={formData.data_despesa}
                      onChange={(e) => setFormData({...formData, data_despesa: e.target.value})}
                      disabled={loading}
                      className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600 focus:border-blue-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={handleAddExpense}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />} 
                    {loading ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>

              {/* Resumo */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <label className="block text-sm font-medium text-slate-300 mb-3">Filtrar por Mês</label>
                  <div className="flex gap-3">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="flex-1 bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    >
                      {[2024, 2025, 2026, 2027].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="flex-1 bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    >
                      <option value="01">Janeiro</option>
                      <option value="02">Fevereiro</option>
                      <option value="03">Março</option>
                      <option value="04">Abril</option>
                      <option value="05">Maio</option>
                      <option value="06">Junho</option>
                      <option value="07">Julho</option>
                      <option value="08">Agosto</option>
                      <option value="09">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-90">Total do Mês</p>
                    <p className="text-3xl font-bold">R$ {totalMonth.toFixed(2)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-90">Despesas</p>
                    <p className="text-3xl font-bold">{expenses.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">📊 Distribuição por Categoria</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={categoryData} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={false} 
                        label={(entry) => `${entry.name.substring(0, 8)} (${categoryPercentage(entry.id)}%)`} 
                        outerRadius={80} 
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.id] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-500">
                    Nenhuma despesa neste mês
                  </div>
                )}
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">📈 Despesas por Categoria</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#1e293b' }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-500">
                    Nenhuma despesa neste mês
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Despesas */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">📋 Despesas Registradas</h3>
              {loading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader className="animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Data</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Descrição</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Categoria</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Pagamento</th>
                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Valor</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length > 0 ? (
                        expenses.sort((a, b) => new Date(b.data_despesa) - new Date(a.data_despesa)).map(exp => (
                          <tr key={exp.id} className="border-b border-slate-700 hover:bg-slate-700">
                            <td className="py-3 px-4 text-slate-200">{new Date(exp.data_despesa).toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 px-4 text-slate-200">{exp.descricao}</td>
                            <td className="py-3 px-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: exp.cor_hex }}>
                                {exp.categoria}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-200">{getPaymentLabel(exp.pay)}</td>
                            <td className="py-3 px-4 text-right text-slate-200 font-semibold">R$ {parseFloat(exp.valor).toFixed(2)}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDelete(exp.id)}
                                className="text-red-500 hover:text-red-400"
                                disabled={loading}
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-500">
                            Nenhuma despesa registrada neste período
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}