import { useState, useCallback } from 'react';
import { fetchGroups, createGroup, updateGroup, deleteGroup, addMember, removeMember } from '../api/groupApi';

const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchGroups();
      setGroups(data.groups);
      return data.groups;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (groupData) => {
    const { data } = await createGroup(groupData);
    setGroups((prev) => [data.group, ...prev]);
    return data.group;
  }, []);

  const update = useCallback(async (id, groupData) => {
    const { data } = await updateGroup(id, groupData);
    setGroups((prev) => prev.map((g) => (g._id === id ? data.group : g)));
    return data.group;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteGroup(id);
    setGroups((prev) => prev.filter((g) => g._id !== id));
  }, []);

  const inviteMember = useCallback(async (groupId, email) => {
    const { data } = await addMember(groupId, email);
    setGroups((prev) => prev.map((g) => (g._id === groupId ? data.group : g)));
    return data.group;
  }, []);

  const kickMember = useCallback(async (groupId, userId) => {
    const { data } = await removeMember(groupId, userId);
    setGroups((prev) => prev.map((g) => (g._id === groupId ? data.group : g)));
    return data.group;
  }, []);

  return { groups, loading, error, loadGroups, create, update, remove, inviteMember, kickMember };
};

export default useGroups;
