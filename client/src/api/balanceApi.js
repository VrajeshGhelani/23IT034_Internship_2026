import axiosInstance from './axiosInstance';

export const fetchBalances = (groupId) => axiosInstance.get(`/api/groups/${groupId}/balances`);
export const fetchSettleUp = (groupId) => axiosInstance.get(`/api/groups/${groupId}/settleup`);
export const recordSettlement = (groupId, data) => axiosInstance.post(`/api/groups/${groupId}/settle`, data);
export const fetchDashboard = () => axiosInstance.get('/api/dashboard');
