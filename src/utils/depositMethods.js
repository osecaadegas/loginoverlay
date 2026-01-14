// Deposit method presets with icons
export const DEPOSIT_METHODS = [
  {
    id: 'crypto',
    name: 'Crypto',
    icon: '₿'
  },
  {
    id: 'mbway',
    name: 'MBWay',
    icon: '📱'
  },
  {
    id: 'credit_card',
    name: 'Credit Card',
    icon: '💳'
  },
  {
    id: 'atm',
    name: 'ATM',
    icon: '🏧'
  },
  {
    id: 'skrill',
    name: 'Skrill',
    icon: '💰'
  },
  {
    id: 'paysafecard',
    name: 'PaysafeCard',
    icon: '🎫'
  },
  {
    id: 'apple_pay',
    name: 'Apple Pay',
    icon: ''
  },
  {
    id: 'google_pay',
    name: 'Google Pay',
    icon: '🅖'
  },
  {
    id: 'sepa',
    name: 'SEPA',
    icon: '🏦'
  }
];

// Get method names from IDs
export const getMethodNames = (methodIds) => {
  if (!methodIds) return '';
  const ids = methodIds.split(',').map(id => id.trim());
  return ids
    .map(id => {
      const method = DEPOSIT_METHODS.find(m => m.id === id);
      return method ? method.name : id;
    })
    .join(', ');
};

// Get method icons from IDs
export const getMethodIcons = (methodIds) => {
  if (!methodIds) return [];
  const ids = methodIds.split(',').map(id => id.trim());
  return ids
    .map(id => {
      const method = DEPOSIT_METHODS.find(m => m.id === id);
      return method || { id, name: id, icon: '💵' };
    });
};
