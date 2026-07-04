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
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1000px] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 w-full pt-8">
        <div className="text-center">
          <div className="inline-block animate-bounce mb-4">
            <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">👑</span>
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 sm:text-5xl tracking-tight pb-2">
            Upgrade to Premium
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-light">
            Unlock Chat and Analytics for your groups and take control of your shared expenses like a pro.
          </p>
        </div>

        <div className="mt-16 max-w-4xl mx-auto grid gap-8 lg:grid-cols-2 lg:max-w-none">
          {/* Monthly Card */}
          <div className="group flex flex-col rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-slate-800/60">
            <h3 className="text-2xl font-semibold text-slate-200">Monthly</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-white tracking-tight">
              ₹99
              <span className="ml-1 text-xl font-medium text-slate-400">/mo</span>
            </div>
            <p className="mt-4 text-slate-400 text-sm">Perfect for short-term group trips and temporary splits.</p>
            <div className="mt-auto pt-8">
              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={loading}
                className="block w-full bg-slate-700/50 hover:bg-slate-600 text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 text-center border border-slate-600 hover:border-slate-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Upgrade Monthly'}
              </button>
            </div>
          </div>

          {/* Yearly Card */}
          <div className="group flex flex-col rounded-3xl bg-gradient-to-b from-indigo-900/40 to-slate-900/40 backdrop-blur-md border border-indigo-500/30 p-8 relative transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] hover:border-indigo-400/50 overflow-hidden">
            
            {/* Background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="absolute top-0 right-8 -translate-y-1/2">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg shadow-indigo-500/30">
                Best Value
              </span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-2xl font-semibold text-indigo-200">Yearly</h3>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold text-white tracking-tight">
                ₹799
                <span className="ml-1 text-xl font-medium text-slate-400">/yr</span>
              </div>
              <p className="mt-4 text-indigo-300/80 text-sm font-medium">Save ₹389 compared to monthly!</p>
            </div>
            
            <div className="mt-auto pt-8 relative z-10">
              <button
                onClick={() => handleUpgrade('yearly')}
                disabled={loading}
                className="block w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] text-center transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? 'Processing...' : 'Upgrade Yearly'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-20 max-w-3xl mx-auto bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 sm:p-10">
          <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 text-center mb-8">
            Premium Features Include
          </h4>
          <ul className="grid gap-6 sm:grid-cols-2 text-slate-300 text-lg">
            {[
              'Real-time Group Chat',
              'Analytics Dashboard (6 charts)',
              'Category spending breakdown',
              'Monthly spending trends',
              'Member balance comparison',
              'Priority 24/7 support'
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
