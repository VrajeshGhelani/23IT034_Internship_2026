import api from './axiosInstance';

export const createOrder = async (billingCycle) => {
  try {
    const { data } = await api.post('/api/payment/create-order', { billingCycle });
    return data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to create order' };
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    const { data } = await api.post('/api/payment/verify', paymentData);
    return data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to verify payment' };
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const { data } = await api.get('/api/payment/status');
    return data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to get status' };
  }
};

export const cancelSubscription = async () => {
  try {
    const { data } = await api.post('/api/payment/cancel');
    return data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Failed to cancel subscription' };
  }
};
