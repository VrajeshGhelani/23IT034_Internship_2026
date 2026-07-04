import { useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '../api/paymentApi';

export const usePremium = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const res = await getSubscriptionStatus();
      if (res.success) {
        setIsPremium(res.isPremium);
        setSubscription(res.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return { isPremium, subscription, loading, refetch: fetchSubscriptionStatus };
};
