import axiosInstance from './axiosInstance';

export const createGroup = (data) => axiosInstance.post('/api/groups', data);
export const fetchGroups = () => axiosInstance.get('/api/groups');
export const fetchGroup = (id) => axiosInstance.get(`/api/groups/${id}`);
export const updateGroup = (id, data) => axiosInstance.put(`/api/groups/${id}`, data);
export const deleteGroup = (id) => axiosInstance.delete(`/api/groups/${id}`);
export const addMember = (groupId, email) => axiosInstance.post(`/api/groups/${groupId}/members`, { email });
export const removeMember = (groupId, userId) => axiosInstance.delete(`/api/groups/${groupId}/members/${userId}`);

// Invite link
export const generateInviteLink = (groupId) => axiosInstance.post(`/api/groups/${groupId}/invite-link`);
export const revokeInviteLink = (groupId) => axiosInstance.post(`/api/groups/${groupId}/revoke-invite`);
export const previewInvite = (token) => axiosInstance.get(`/api/groups/join/${token}`);
export const joinByToken = (token) => axiosInstance.post(`/api/groups/join/${token}`);

// PDF export
export const exportGroupPDF = (groupId) =>
  axiosInstance.get(`/api/groups/${groupId}/export-pdf`, { responseType: 'blob' });
