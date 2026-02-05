'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Storage helper
const Storage = {
  get: (key, defaultValue) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(`focusflow_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`focusflow_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

// Default reward categories
export const REWARD_CATEGORIES = {
  TREAT: { id: 'treat', name: 'Treats', emoji: '🍪' },
  ENTERTAINMENT: { id: 'entertainment', name: 'Entertainment', emoji: '🎮' },
  SELF_CARE: { id: 'self_care', name: 'Self Care', emoji: '💆' },
  SOCIAL: { id: 'social', name: 'Social', emoji: '👥' },
  PURCHASE: { id: 'purchase', name: 'Purchases', emoji: '🛍️' },
  EXPERIENCE: { id: 'experience', name: 'Experiences', emoji: '🎭' },
  OTHER: { id: 'other', name: 'Other', emoji: '✨' }
};

// Default rewards (examples)
const DEFAULT_REWARDS = [
  { id: 'coffee', name: 'Fancy Coffee', emoji: '☕', category: 'treat', cost: 100, description: 'Treat yourself to a nice latte' },
  { id: 'movie', name: 'Movie Night', emoji: '🎬', category: 'entertainment', cost: 200, description: 'Watch a movie guilt-free' },
  { id: 'nap', name: 'Guilt-Free Nap', emoji: '😴', category: 'self_care', cost: 150, description: '30-minute power nap' },
  { id: 'snack', name: 'Favorite Snack', emoji: '🍫', category: 'treat', cost: 75, description: 'Get your favorite snack' },
  { id: 'game', name: 'Gaming Session', emoji: '🎮', category: 'entertainment', cost: 250, description: '1 hour of guilt-free gaming' },
  { id: 'walk', name: 'Nature Walk', emoji: '🌳', category: 'self_care', cost: 100, description: 'Take a relaxing walk outside' },
  { id: 'friend', name: 'Call a Friend', emoji: '📞', category: 'social', cost: 50, description: 'Catch up with someone you care about' },
  { id: 'bath', name: 'Bubble Bath', emoji: '🛁', category: 'self_care', cost: 150, description: 'Long relaxing bath' },
  { id: 'takeout', name: 'Takeout Night', emoji: '🍕', category: 'treat', cost: 300, description: 'Order from your favorite place' },
  { id: 'book', name: 'Reading Time', emoji: '📚', category: 'entertainment', cost: 100, description: '1 hour of reading for pleasure' }
];

// App unlockables (special rewards within the app)
const APP_UNLOCKABLES = [
  { id: 'theme_cosmic', name: 'Cosmic Theme', emoji: '🌌', cost: 500, type: 'theme', description: 'Unlock the cosmic background theme' },
  { id: 'theme_aurora', name: 'Aurora Theme', emoji: '🌈', cost: 500, type: 'theme', description: 'Unlock the aurora borealis theme' },
  { id: 'sound_chiptune', name: 'Chiptune Sounds', emoji: '👾', cost: 300, type: 'sound', description: 'Retro game celebration sounds' },
  { id: 'badge_collector', name: 'Collector Badge', emoji: '🏅', cost: 1000, type: 'badge', description: 'Special profile badge' },
  { id: 'frog_golden', name: 'Golden Frog', emoji: '🐸', cost: 2000, type: 'cosmetic', description: 'Golden frog character' },
  { id: 'xp_boost', name: 'XP Boost (1 day)', emoji: '⚡', cost: 400, type: 'boost', description: '1.5x XP for 24 hours' }
];

// Hook to manage reward shop
export function useRewardShop(currentXP, onSpendXP) {
  const [customRewards, setCustomRewards] = useState(() =>
    Storage.get('customRewards', [])
  );
  const [purchasedRewards, setPurchasedRewards] = useState(() =>
    Storage.get('purchasedRewards', [])
  );
  const [redeemedRewards, setRedeemedRewards] = useState(() =>
    Storage.get('redeemedRewards', [])
  );
  const [unlockedItems, setUnlockedItems] = useState(() =>
    Storage.get('unlockedItems', [])
  );
  const [wishlist, setWishlist] = useState(() =>
    Storage.get('rewardWishlist', [])
  );

  // Save to storage
  useEffect(() => {
    Storage.set('customRewards', customRewards);
  }, [customRewards]);

  useEffect(() => {
    Storage.set('purchasedRewards', purchasedRewards);
  }, [purchasedRewards]);

  useEffect(() => {
    Storage.set('redeemedRewards', redeemedRewards);
  }, [redeemedRewards]);

  useEffect(() => {
    Storage.set('unlockedItems', unlockedItems);
  }, [unlockedItems]);

  useEffect(() => {
    Storage.set('rewardWishlist', wishlist);
  }, [wishlist]);

  // All rewards combined
  const allRewards = useMemo(() => {
    return [...DEFAULT_REWARDS, ...customRewards];
  }, [customRewards]);

  // Add custom reward
  const addReward = useCallback((reward) => {
    const newReward = {
      ...reward,
      id: `custom_${Date.now()}`,
      isCustom: true
    };
    setCustomRewards(prev => [...prev, newReward]);
    return newReward;
  }, []);

  // Update reward
  const updateReward = useCallback((rewardId, updates) => {
    setCustomRewards(prev => prev.map(r =>
      r.id === rewardId ? { ...r, ...updates } : r
    ));
  }, []);

  // Delete custom reward
  const deleteReward = useCallback((rewardId) => {
    setCustomRewards(prev => prev.filter(r => r.id !== rewardId));
  }, []);

  // Purchase reward
  const purchaseReward = useCallback((reward) => {
    if (currentXP < reward.cost) return false;

    onSpendXP(reward.cost);

    const purchase = {
      id: `purchase_${Date.now()}`,
      rewardId: reward.id,
      rewardName: reward.name,
      rewardEmoji: reward.emoji,
      cost: reward.cost,
      purchasedAt: new Date().toISOString(),
      redeemed: false
    };

    setPurchasedRewards(prev => [purchase, ...prev]);
    return purchase;
  }, [currentXP, onSpendXP]);

  // Redeem purchased reward
  const redeemReward = useCallback((purchaseId) => {
    setPurchasedRewards(prev => prev.map(p =>
      p.id === purchaseId ? { ...p, redeemed: true, redeemedAt: new Date().toISOString() } : p
    ));

    const purchase = purchasedRewards.find(p => p.id === purchaseId);
    if (purchase) {
      setRedeemedRewards(prev => [{
        ...purchase,
        redeemed: true,
        redeemedAt: new Date().toISOString()
      }, ...prev].slice(0, 100));
    }
  }, [purchasedRewards]);

  // Purchase app unlockable
  const purchaseUnlockable = useCallback((item) => {
    if (currentXP < item.cost) return false;
    if (unlockedItems.includes(item.id)) return false;

    onSpendXP(item.cost);
    setUnlockedItems(prev => [...prev, item.id]);
    return true;
  }, [currentXP, unlockedItems, onSpendXP]);

  // Check if item is unlocked
  const isUnlocked = useCallback((itemId) => {
    return unlockedItems.includes(itemId);
  }, [unlockedItems]);

  // Toggle wishlist
  const toggleWishlist = useCallback((rewardId) => {
    setWishlist(prev =>
      prev.includes(rewardId)
        ? prev.filter(id => id !== rewardId)
        : [...prev, rewardId]
    );
  }, []);

  // Check if in wishlist
  const isInWishlist = useCallback((rewardId) => {
    return wishlist.includes(rewardId);
  }, [wishlist]);

  // Get unredeemed purchases
  const unredeemedPurchases = useMemo(() => {
    return purchasedRewards.filter(p => !p.redeemed);
  }, [purchasedRewards]);

  // Get affordable rewards
  const affordableRewards = useMemo(() => {
    return allRewards.filter(r => r.cost <= currentXP);
  }, [allRewards, currentXP]);

  // Get stats
  const stats = useMemo(() => {
    const totalSpent = redeemedRewards.reduce((sum, r) => sum + r.cost, 0);
    const totalRedeemed = redeemedRewards.length;
    const pendingRedemptions = unredeemedPurchases.length;

    return {
      totalSpent,
      totalRedeemed,
      pendingRedemptions,
      unlockedCount: unlockedItems.length
    };
  }, [redeemedRewards, unredeemedPurchases, unlockedItems]);

  return {
    // State
    allRewards,
    customRewards,
    purchasedRewards,
    unredeemedPurchases,
    redeemedRewards,
    unlockedItems,
    wishlist,
    affordableRewards,
    stats,

    // Actions
    addReward,
    updateReward,
    deleteReward,
    purchaseReward,
    redeemReward,
    purchaseUnlockable,
    isUnlocked,
    toggleWishlist,
    isInWishlist,

    // Data
    REWARD_CATEGORIES,
    APP_UNLOCKABLES
  };
}

// Reward Card Component
export function RewardCard({
  reward,
  currentXP,
  onPurchase,
  onWishlist,
  isInWishlist,
  isPurchased = false
}) {
  const canAfford = currentXP >= reward.cost;

  return (
    <div className={`glass-card p-4 ${!canAfford && !isPurchased ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{reward.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{reward.name}</div>
            <button
              onClick={() => onWishlist(reward.id)}
              className="text-lg"
            >
              {isInWishlist ? '❤️' : '🤍'}
            </button>
          </div>
          <p className="text-sm text-white/60 mt-1">{reward.description}</p>
          <div className="flex items-center justify-between mt-3">
            <span className={`text-sm font-medium ${canAfford ? 'text-yellow-400' : 'text-white/40'}`}>
              {reward.cost} XP
            </span>
            {!isPurchased && (
              <button
                onClick={() => onPurchase(reward)}
                disabled={!canAfford}
                className="glass-button px-3 py-1 text-sm bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canAfford ? 'Purchase' : 'Need more XP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Purchased Reward Card
export function PurchasedRewardCard({ purchase, onRedeem }) {
  return (
    <div className="glass-card p-4 border-2 border-green-500/30">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{purchase.rewardEmoji}</span>
        <div className="flex-1">
          <div className="font-semibold">{purchase.rewardName}</div>
          <div className="text-xs text-white/40">
            Purchased {new Date(purchase.purchasedAt).toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={() => onRedeem(purchase.id)}
          className="glass-button px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30"
        >
          🎁 Redeem
        </button>
      </div>
    </div>
  );
}

// Add Reward Form
export function AddRewardForm({ onAdd, onCancel }) {
  const [reward, setReward] = useState({
    name: '',
    emoji: '🎁',
    category: 'other',
    cost: 100,
    description: ''
  });

  const handleAdd = () => {
    if (reward.name.trim() && reward.cost > 0) {
      onAdd(reward);
    }
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <h3 className="font-semibold">Add Custom Reward</h3>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-white/60">Emoji</label>
          <input
            type="text"
            value={reward.emoji}
            onChange={(e) => setReward(prev => ({ ...prev, emoji: e.target.value }))}
            className="glass-input w-full mt-1 text-center text-2xl"
            maxLength={2}
          />
        </div>
        <div className="col-span-3">
          <label className="text-sm text-white/60">Name</label>
          <input
            type="text"
            value={reward.name}
            onChange={(e) => setReward(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Reward name"
            className="glass-input w-full mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-white/60">Category</label>
          <select
            value={reward.category}
            onChange={(e) => setReward(prev => ({ ...prev, category: e.target.value }))}
            className="glass-input w-full mt-1"
          >
            {Object.values(REWARD_CATEGORIES).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-white/60">Cost (XP)</label>
          <input
            type="number"
            min={1}
            value={reward.cost}
            onChange={(e) => setReward(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
            className="glass-input w-full mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-white/60">Description</label>
        <input
          type="text"
          value={reward.description}
          onChange={(e) => setReward(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What is this reward?"
          className="glass-input w-full mt-1"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="glass-button flex-1 py-2">Cancel</button>
        <button
          onClick={handleAdd}
          disabled={!reward.name.trim() || reward.cost <= 0}
          className="glass-button flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50"
        >
          Add Reward
        </button>
      </div>
    </div>
  );
}

// Reward Shop Modal
export function RewardShopModal({
  isOpen,
  onClose,
  currentXP,
  allRewards,
  unredeemedPurchases,
  affordableRewards,
  wishlist,
  stats,
  unlockedItems,
  onPurchase,
  onRedeem,
  onAddReward,
  onDeleteReward,
  onToggleWishlist,
  isInWishlist,
  onPurchaseUnlockable,
  isUnlocked
}) {
  const [activeTab, setActiveTab] = useState('shop');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isOpen) return null;

  const filteredRewards = selectedCategory === 'all'
    ? allRewards
    : allRewards.filter(r => r.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">🏪 Reward Shop</h2>
            <button onClick={onClose} className="text-2xl opacity-60 hover:opacity-100">×</button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-400">💰 {currentXP} XP available</span>
            {unredeemedPurchases.length > 0 && (
              <span className="text-green-400">🎁 {unredeemedPurchases.length} to redeem</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['shop', 'pending', 'unlockables', 'custom'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-yellow-500 text-yellow-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'shop' && (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === 'all' ? 'bg-yellow-500/30' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  All
                </button>
                {Object.values(REWARD_CATEGORIES).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === cat.id ? 'bg-yellow-500/30' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {cat.emoji}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredRewards.map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    currentXP={currentXP}
                    onPurchase={onPurchase}
                    onWishlist={onToggleWishlist}
                    isInWishlist={isInWishlist(reward.id)}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-3">
              {unredeemedPurchases.length === 0 ? (
                <div className="text-center text-white/40 py-8">
                  <p>No pending rewards</p>
                  <p className="text-sm mt-2">Purchase rewards to redeem them later!</p>
                </div>
              ) : (
                unredeemedPurchases.map(purchase => (
                  <PurchasedRewardCard
                    key={purchase.id}
                    purchase={purchase}
                    onRedeem={onRedeem}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'unlockables' && (
            <div className="space-y-3">
              <p className="text-sm text-white/60 mb-4">
                Permanent app unlocks and boosts
              </p>
              {APP_UNLOCKABLES.map(item => (
                <div key={item.id} className={`glass-card p-4 ${isUnlocked(item.id) ? 'border-2 border-green-500/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{item.name}</div>
                      <p className="text-sm text-white/60">{item.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-yellow-400">{item.cost} XP</span>
                        {isUnlocked(item.id) ? (
                          <span className="text-green-400">✓ Unlocked</span>
                        ) : (
                          <button
                            onClick={() => onPurchaseUnlockable(item)}
                            disabled={currentXP < item.cost}
                            className="glass-button px-3 py-1 text-sm bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50"
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-3">
              {showAddForm ? (
                <AddRewardForm
                  onAdd={(reward) => {
                    onAddReward(reward);
                    setShowAddForm(false);
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
                <>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="glass-card p-4 w-full text-center hover:bg-white/10 transition-colors"
                  >
                    <span className="text-2xl">+</span>
                    <div className="text-sm text-white/60">Add Custom Reward</div>
                  </button>

                  {allRewards.filter(r => r.isCustom).map(reward => (
                    <div key={reward.id} className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{reward.emoji}</span>
                          <div>
                            <div className="font-medium">{reward.name}</div>
                            <div className="text-sm text-yellow-400">{reward.cost} XP</div>
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteReward(reward.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-bold">{stats.totalSpent}</div>
              <div className="text-xs text-white/40">XP Spent</div>
            </div>
            <div>
              <div className="font-bold">{stats.totalRedeemed}</div>
              <div className="text-xs text-white/40">Redeemed</div>
            </div>
            <div>
              <div className="font-bold">{stats.unlockedCount}</div>
              <div className="text-xs text-white/40">Unlocked</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RewardShopModal;
