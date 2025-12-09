// Slot Machine Images Configuration
// You can easily swap these image URLs to change the slot symbols

export const slotImages = {
  cherry: '/cherry.png',
  lemon: '/lemon.png',
  grape: '/grape.png',
  watermelon: '/watermelon.png',
  seven: '/seven.png'
};

// Prize configuration (points for each winning combination)
export const prizes = {
  seven: { points: 1000, label: '1000 POINTS' },
  cherry: { points: 500, label: '500 POINTS' },
  lemon: { points: 300, label: '300 POINTS' },
  grape: { points: 200, label: '200 POINTS' },
  watermelon: { points: 100, label: '100 POINTS' }
};

// Symbols array for random selection
export const symbols = ['cherry', 'lemon', 'grape', 'watermelon', 'seven'];
