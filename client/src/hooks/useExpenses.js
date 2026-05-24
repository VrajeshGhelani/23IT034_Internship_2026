import { useState, useCallback } from 'react';
import { fetchExpenses, addExpense, updateExpense, deleteExpense } from '../api/expenseApi';

const useExpenses = (groupId) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadExpenses = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchExpenses(groupId);
      setExpenses(data.expenses);
      return data.expenses;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const add = useCallback(async (expenseData) => {
    // expenseData can be either a plain object or FormData (for receipt uploads)
    const { data } = await addExpense(groupId, expenseData);
    setExpenses((prev) => [data.expense, ...prev]);
    return data.expense;
  }, [groupId]);

  const update = useCallback(async (expenseId, expenseData) => {
    const { data } = await updateExpense(expenseId, expenseData);
    setExpenses((prev) => prev.map((e) => (e._id === expenseId ? data.expense : e)));
    return data.expense;
  }, []);

  const remove = useCallback(async (expenseId) => {
    await deleteExpense(expenseId);
    setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
  }, []);

  return { expenses, loading, error, loadExpenses, add, update, remove };
};

export default useExpenses;
