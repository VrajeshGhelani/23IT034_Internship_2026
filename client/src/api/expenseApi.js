import axiosInstance from './axiosInstance';

export const fetchExpenses = (groupId) => axiosInstance.get(`/api/groups/${groupId}/expenses`);

export const addExpense = (groupId, data) => {
  // If data is FormData, send it directly (receipt upload case)
  if (data instanceof FormData) {
    return axiosInstance.post(`/api/groups/${groupId}/expenses`, data);
  }
  return axiosInstance.post(`/api/groups/${groupId}/expenses`, data);
};

export const updateExpense = (expenseId, data) => axiosInstance.put(`/api/expenses/${expenseId}`, data);
export const deleteExpense = (expenseId) => axiosInstance.delete(`/api/expenses/${expenseId}`);

export const replaceReceipt = (expenseId, formData) =>
  axiosInstance.put(`/api/expenses/${expenseId}/receipt`, formData);
