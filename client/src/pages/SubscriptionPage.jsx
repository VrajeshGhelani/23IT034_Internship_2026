import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelSubscription } from '../api/paymentApi';
import { usePremium } from '../hooks/usePremium';

const SubscriptionPage = () => {
  const { isPremium, subscription, loading, refetch } = usePremium();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <div className="text-white text-center mt-20">Loading...</div>;

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white px-4">
        <h2 className="text-3xl font-bold mb-4">No Active Subscription</h2>
        <p className="text-gray-400 mb-8">You are currently on the free plan.</p>
        <button
          onClick={() => navigate('/premium')}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 py-3 px-6 rounded-lg font-bold"
        >
          Upgrade to Premium
        </button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel your premium subscription? You will lose access to premium features immediately.')) {
      try {
        setCancelling(true);
        const res = await cancelSubscription();
        if (res.success) {
          alert('Subscription cancelled');
          await refetch();
          window.location.reload(); // Refresh state
        } else {
          alert(res.message || 'Failed to cancel subscription');
        }
      } catch (error) {
        console.error(error);
        alert('Error cancelling subscription');
      } finally {
        setCancelling(false);
      }
    }
  };

  const endDate = new Date(subscription.endDate);
  const today = new Date();
  const diffTime = Math.abs(endDate - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
        <div className="bg-indigo-600 px-6 py-8 sm:p-10 sm:pb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-white">Your Subscription</h2>
            <p className="mt-2 text-indigo-200">Manage your premium plan</p>
          </div>
          <div className="text-5xl">👑</div>
        </div>
        
        <div className="px-6 py-8 sm:p-10 space-y-6 text-white">
          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">Plan</span>
            <span className="font-bold capitalize">{subscription.billingCycle} Premium</span>
          </div>
          
          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">Status</span>
            <span className="font-bold text-green-400 capitalize">{subscription.status}</span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">Time Remaining</span>
            <span className="font-bold text-indigo-400">{diffDays} days remaining</span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">End Date</span>
            <span className="font-bold">{endDate.toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">Payment ID</span>
            <span className="font-mono text-sm text-gray-500">{subscription.razorpayPaymentId}</span>
          </div>

          <div className="pt-6">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full sm:w-auto bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
