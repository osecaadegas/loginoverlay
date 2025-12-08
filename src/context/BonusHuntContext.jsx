import { createContext, useContext, useState, useEffect } from 'react';
import { calculateStats } from '../utils/calculations';
import { findSlotByName, DEFAULT_SLOT_IMAGE } from '../utils/slotUtils';
import { useAuth } from './AuthContext';
import { 
  getUserOverlayState, 
  updateOverlayBonuses, 
  updateCustomization,
  subscribeToOverlayState,
  unsubscribe
} from '../utils/overlayUtils';

const BonusHuntContext = createContext();

export const useBonusHunt = () => {
  const context = useContext(BonusHuntContext);
  if (!context) {
    throw new Error('useBonusHunt must be used within BonusHuntProvider');
  }
  return context;
};

export const BonusHuntProvider = ({ children }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to load from localStorage
  const loadFromStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  };

  // Bonus hunt state - will be synced with database
  const [bonuses, setBonuses] = useState([]);
  const [startMoney, setStartMoney] = useState(0);
  const [stopMoney, setStopMoney] = useState(0);
  const [actualBalance, setActualBalance] = useState(0);
  const [customSlotImages, setCustomSlotImages] = useState({});
  
  // UI state
  const [layoutMode, setLayoutMode] = useState('modern-sidebar');
  const [currentOpeningIndex, setCurrentOpeningIndex] = useState(0);
  const [showBonusOpening, setShowBonusOpening] = useState(false);

  // Load user's overlay state from database on mount
  useEffect(() => {
    if (!user) {
      setIsInitialized(false);
      return;
    }

    const loadUserState = async () => {
      try {
        const state = await getUserOverlayState(user.id);
        if (state) {
          setBonuses(state.bonuses || []);
          setStartMoney(state.total_cost || 0);
          setActualBalance(state.total_payout || 0);
          setCustomSlotImages(state.custom_slot_images || {});
          setLayoutMode(state.layout_mode || 'modern-sidebar');
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading user overlay state:', error);
        setIsInitialized(true);
      }
    };

    loadUserState();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !isInitialized) return;

    const subscription = subscribeToOverlayState(user.id, (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const newState = payload.new;
        setBonuses(newState.bonuses || []);
        setStartMoney(newState.total_cost || 0);
        setActualBalance(newState.total_payout || 0);
        setCustomSlotImages(newState.custom_slot_images || {});
        setLayoutMode(newState.layout_mode || 'modern-sidebar');
      }
    });

    return () => {
      unsubscribe(subscription);
    };
  }, [user, isInitialized]);

  // Save to database whenever bonus hunt state changes
  useEffect(() => {
    if (!user || !isInitialized) return;

    const saveToDatabase = async () => {
      try {
        const stats = calculateStats(bonuses, startMoney, actualBalance);
        await updateOverlayBonuses(user.id, bonuses, {
          totalCost: startMoney,
          totalPayout: actualBalance,
          huntMultiplier: stats.huntMultiplier,
          huntStarted: bonuses.length > 0
        });
      } catch (error) {
        console.error('Error saving bonus hunt to database:', error);
      }
    };

    const debounceTimer = setTimeout(saveToDatabase, 500);
    return () => clearTimeout(debounceTimer);
  }, [bonuses, startMoney, actualBalance, user, isInitialized]);
  
  // Calculate total spent
  const totalSpent = startMoney - stopMoney;

  // Calculate stats with startMoney and actualBalance (Stop Loss)
  const stats = calculateStats(bonuses, startMoney, actualBalance);

  // Add bonus
  const addBonus = (bonusData) => {
    const newBonus = {
      id: Date.now(),
      slotName: bonusData.slotName,
      betSize: parseFloat(bonusData.betSize),
      expectedRTP: bonusData.expectedRTP || 96.00,
      multiplier: null,
      opened: false,
      isSuper: bonusData.isSuper || false,
      timestamp: new Date().toISOString()
    };
    setBonuses(prev => [...prev, newBonus]);
  };

  // Update bonus result
  const updateBonusResult = (bonusId, payout) => {
    setBonuses(prev => prev.map(bonus => {
      if (bonus.id === bonusId) {
        const multiplier = payout / bonus.betSize;
        return {
          ...bonus,
          multiplier: multiplier,
          opened: true
        };
      }
      return bonus;
    }));
  };

  // Update entire bonus (for editing)
  const updateBonus = (bonusId, updates) => {
    setBonuses(prev => prev.map(bonus => {
      if (bonus.id === bonusId) {
        return {
          ...bonus,
          ...updates
        };
      }
      return bonus;
    }));
  };

  // Delete bonus
  const deleteBonus = (bonusId) => {
    setBonuses(prev => prev.filter(bonus => bonus.id !== bonusId));
  };

  // Toggle super status
  const toggleSuperStatus = (bonusId) => {
    setBonuses(prev => prev.map(bonus => {
      if (bonus.id === bonusId) {
        return { ...bonus, isSuper: !bonus.isSuper };
      }
      return bonus;
    }));
  };

  // Clear all bonuses
  const clearAllBonuses = () => {
    setBonuses([]);
  };

  // Set custom image for slot
  const setCustomSlotImage = async (slotName, imageUrl) => {
    const newImages = {
      ...customSlotImages,
      [slotName.toLowerCase()]: imageUrl
    };
    setCustomSlotImages(newImages);
    
    if (user) {
      try {
        await updateCustomization(user.id, { custom_slot_images: newImages });
      } catch (error) {
        console.error('Error saving custom slot image:', error);
      }
    }
  };

  // Get slot image (synchronous - for use with slot data already fetched)
  const getSlotImage = (slotName, slotData = null) => {
    // Check custom images first
    if (customSlotImages[slotName.toLowerCase()]) {
      return customSlotImages[slotName.toLowerCase()];
    }
    
    // If slot data is provided, use it
    if (slotData && slotData.image) {
      return slotData.image;
    }
    
    // Use selected default image from localStorage or fall back to DEFAULT_SLOT_IMAGE
    const defaultImage = localStorage.getItem('defaultSlotImage') || 'zilhas.png';
    return `/${defaultImage}`;
  };

  // Navigate to next bonus in opening mode
  const nextBonus = () => {
    if (currentOpeningIndex < bonuses.length - 1) {
      setCurrentOpeningIndex(prev => prev + 1);
    }
  };

  // Navigate to previous bonus in opening mode
  const previousBonus = () => {
    if (currentOpeningIndex > 0) {
      setCurrentOpeningIndex(prev => prev - 1);
    }
  };



  // Export bonuses to JSON file
  const exportBonuses = () => {
    const data = {
      bonuses,
      startMoney,
      stopMoney,
      actualBalance,
      customSlotImages,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bonus-hunt-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import bonuses from JSON file
  const importBonuses = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.bonuses) setBonuses(data.bonuses);
        if (data.startMoney !== undefined) setStartMoney(data.startMoney);
        if (data.stopMoney !== undefined) setStopMoney(data.stopMoney);
        if (data.actualBalance !== undefined) setActualBalance(data.actualBalance);
        if (data.customSlotImages) setCustomSlotImages(data.customSlotImages);
      } catch (error) {
        console.error('Error importing bonus hunt:', error);
        console.error('Error importing file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const value = {
    // State
    bonuses,
    startMoney,
    stopMoney,
    actualBalance,
    totalSpent,
    stats,
    layoutMode,
    currentOpeningIndex,
    showBonusOpening,
    customSlotImages,
    
    // Actions
    addBonus,
    updateBonusResult,
    updateBonus,
    deleteBonus,
    clearAllBonuses,
    toggleSuperStatus,
    setStartMoney,
    setStopMoney,
    setActualBalance,
    setLayoutMode,
    setCustomSlotImage,
    getSlotImage,
    nextBonus,
    previousBonus,
    setShowBonusOpening,
    setCurrentOpeningIndex,
    exportBonuses,
    importBonuses
  };

  return (
    <BonusHuntContext.Provider value={value}>
      {children}
    </BonusHuntContext.Provider>
  );
};

export default BonusHuntContext;
