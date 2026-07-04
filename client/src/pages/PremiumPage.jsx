import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, verifyPayment } from '../api/paymentApi';
import useAuth from '../hooks/useAuth';

const PremiumPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // or equivalent depending on auth context
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (billingCycle) => {
    try {
      setLoading(true);
      const data = await createOrder(billingCycle);
      if (!data.success) {
        alert(data.message || 'Failed to initiate payment');
        return;
      }

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: 'INR',
        name: 'SplitEase',
        description: 'Premium Subscription',
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const res = await verifyPayment({
              ...response, 
              billingCycle
            });
            if (res.success) {
              alert('Premium activated! Welcome to the club 👑');
              navigate('/dashboard');
              // Ideally refresh auth context here
              window.location.reload(); // simple way to refresh state
            } else {
              alert(res.message || 'Payment verification failed');
            }
          } catch (err) {
            alert('Error verifying payment');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          method: 'upi'
        },
        theme: { color: '#6366f1' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <div className="text-6xl mb-4">👑</div>
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
            Upgrade to Premium
          </h2>
          <p className="mt-4 text-xl text-gray-400">
            Unlock Chat and Analytics for your groups and take control of your shared expenses.
          </p>
        </div>

        <div className="mt-16 max-w-4xl mx-auto grid gap-8 lg:grid-cols-2 lg:max-w-none">
          {/* Monthly Card */}
          <div className="flex flex-col rounded-2xl shadow-xl bg-gray-800 border border-gray-700 p-8">
            <h3 className="text-2xl font-semibold text-white">Monthly</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-white">
              ₹99
              <span className="ml-1 text-xl font-medium text-gray-400">/mo</span>
            </div>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={loading}
              className="mt-8 block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Upgrade Now
            </button>
          </div>

          {/* Yearly Card */}
          <div className="flex flex-col rounded-2xl shadow-xl bg-gradient-to-b from-indigo-900 to-gray-800 border-2 border-indigo-500 p-8 relative">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
              <span className="bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide py-1 px-3 rounded-full">
                Best Value
              </span>
            </div>
            <h3 className="text-2xl font-semibold text-white">Yearly</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-white">
              ₹799
              <span className="ml-1 text-xl font-medium text-gray-400">/yr</span>
            </div>
            <p className="mt-2 text-indigo-300">Save ₹389 compared to monthly!</p>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={loading}
              className="mt-8 block w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/25 text-center"
            >
              Upgrade Now
            </button>
          </div>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <h4 className="text-2xl font-bold text-white text-center mb-8">Premium Features Include:</h4>
          <ul className="grid gap-4 sm:grid-cols-2 text-gray-300 text-lg">
            <li className="flex items-center"><span className="text-green-400 mr-2">✅</span> Real-time Group Chat</li>
            <li className="flex items-center"><span className="text-green-400 mr-2">✅</span> Analytics Dashboard (6 charts)</li>
            <li className="flex items-center"><span className="text-green-400 mr-2">✅</span> Category spending breakdown</li>
            <li className="flex items-center"><span className="text-green-400 mr-2">✅</span> Monthly spending trends</li>
            <li className="flex items-center"><span className="text-green-400 mr-2">✅</span> Member balance comparison</li>
            <li className="flex items-center"><span className="text-green-400 mr-2">✅</span> Priority support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
