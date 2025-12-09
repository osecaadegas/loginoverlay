import { useState, useRef, useEffect } from 'react';
import './CoinFlip.css';
import useDraggable from '../../hooks/useDraggable';

const CoinFlip = ({ onClose }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [finalSide, setFinalSide] = useState('heads');
  const draggableRef = useDraggable(true, 'coinflip');

  const flipCoin = () => {
    if (isFlipping) return;

    setIsFlipping(true);

    // Determine result (50/50 chance)
    const side = Math.random() < 0.5 ? 'heads' : 'tails';

    // Set final side for animation
    setFinalSide(side);

    // Keep the final result showing (don't reset)
    setTimeout(() => {
      setIsFlipping(false);
    }, 3500);
  };

  return (
    <div className="coinflip-overlay">
      <div 
        className={`coin ${isFlipping ? `flipping-${finalSide}` : finalSide}`}
        onClick={flipCoin}
        style={{ cursor: isFlipping ? 'not-allowed' : 'pointer' }}
        title={isFlipping ? 'Flipping...' : 'Click to flip coin'}
      >
        <div className="coin-face coin-heads">
          <img src="/heads.png" alt="Heads" className="coin-image" />
        </div>
        <div className="coin-face coin-tails">
          <img src="/tails.png" alt="Tails" className="coin-image" />
        </div>
      </div>
    </div>
  );
};

export default CoinFlip;
