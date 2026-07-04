import React from 'react';
import { useNavigate } from 'react-router-dom';

const PremiumLockOverlay = ({ featureName }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm bg-black/50 rounded-lg">
      <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full">
        <div className="text-6xl mb-4">👑</div>
        <h3 className="text-2xl font-bold text-white mb-2">Premium Feature</h3>
        <p className="text-gray-300 mb-6">
          {featureName} is available on the Premium plan. Upgrade to unlock this and other advanced features for your groups.
        </p>
        <button
          onClick={() => navigate('/premium')}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/25 mb-4"
        >
          Upgrade to Premium - Rs.99/mo
        </button>
        <p className="text-sm text-gray-400">
          Already premium? Try refreshing
        </p>
      </div>
    </div>
  );
};

export default PremiumLockOverlay;
