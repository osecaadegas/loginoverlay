import { useState, useRef } from 'react';
import './SlotMachineOverlay.css';
import useDraggable from '../../hooks/useDraggable';
import { slotImages, prizes, symbols } from './slotImages';

const SlotMachineOverlay = ({ onClose }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['cherry', 'lemon', 'grape']);
  const [resultMessage, setResultMessage] = useState('');
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  
  const reelRefs = [useRef(null), useRef(null), useRef(null)];
  const draggableRef = useDraggable(true, 'slotmachine');

  const getRandomSymbol = () => {
    return symbols[Math.floor(Math.random() * symbols.length)];
  };

  const generateWinningCombination = () => {
    const winChance = Math.random();
    
    // 70% chance of winning - all 3 symbols match (7 out of 10)
    if (winChance < 0.70) {
      const winningSymbol = getRandomSymbol();
      console.log('WIN GENERATED:', winningSymbol, winningSymbol, winningSymbol);
      return [winningSymbol, winningSymbol, winningSymbol];
    }
    
    // 30% chance of losing - ensure symbols DON'T all match (3 out of 10)
    const result = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    
    // If by random chance all 3 match, force a different symbol on the last reel
    if (result[0] === result[1] && result[1] === result[2]) {
      const availableSymbols = symbols.filter(s => s !== result[0]);
      result[2] = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
    }
    
    console.log('LOSE GENERATED:', result);
    return result;
  };

  const createReelStrip = (reelIndex) => {
    // Create a strip of random symbols
    const strip = [];
    for (let i = 0; i < 30; i++) {
      strip.push(getRandomSymbol());
    }
    return strip;
  };

  const spin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResultMessage('');
    
    const finalSymbols = generateWinningCombination();
    console.log('Target symbols:', finalSymbols);
    
    // Start all reels spinning
    setSpinningReels([true, true, true]);
    
    // Create random symbol strips for animation
    const strips = [
      createReelStrip(0),
      createReelStrip(1),
      createReelStrip(2)
    ];
    
    // Animate each reel with cycling symbols
    let currentIndex = [0, 0, 0];
    const stoppedReels = [false, false, false];
    
    const cycleInterval = setInterval(() => {
      setReels([
        stoppedReels[0] ? finalSymbols[0] : strips[0][currentIndex[0] % strips[0].length],
        stoppedReels[1] ? finalSymbols[1] : strips[1][currentIndex[1] % strips[1].length],
        stoppedReels[2] ? finalSymbols[2] : strips[2][currentIndex[2] % strips[2].length]
      ]);
      currentIndex = currentIndex.map(i => i + 1);
    }, 50);
    
    // Stop reels one by one - left, middle, right
    const stopTimes = [1500, 2200, 2900];
    
    stopTimes.forEach((time, i) => {
      setTimeout(() => {
        // Mark this reel as stopped
        stoppedReels[i] = true;
        
        // Stop spinning animation
        setSpinningReels(prev => {
          const newSpinning = [...prev];
          newSpinning[i] = false;
          return newSpinning;
        });
        
        // Set final symbol immediately
        setReels(prev => {
          const newReels = [...prev];
          newReels[i] = finalSymbols[i];
          console.log(`Reel ${i} stopped at:`, finalSymbols[i]);
          return newReels;
        });
        
        // Clear interval and check result after last reel stops
        if (i === 2) {
          clearInterval(cycleInterval);
          
          setTimeout(() => {
            const allMatch = finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2];
            
            setIsSpinning(false);
            
            if (allMatch) {
              const symbol = finalSymbols[0];
              const prize = prizes[symbol];
              setResultMessage(`🎉 CONGRATULATIONS! You won ${prize.points} POINTS! 🎉`);
              console.log('WIN!', symbol, prize);
            } else {
              setResultMessage('😢 Try again!');
              console.log('LOSE:', finalSymbols);
            }
            
            // Clear result message after 10 seconds
            setTimeout(() => {
              setResultMessage('');
            }, 10000);
          }, 300);
        }
      }, time);
    });
  };

  return (
    <div className="slotmachine-overlay">
      <div className="slotmachine-panel" ref={draggableRef}>
        <div className="slotmachine-header drag-handle">
          <h2>🎰 SLOT MACHINE</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="slotmachine-content">
          <div className="slot-machine-container">
            <div className="reels-container">
              {reels.map((symbol, index) => (
                <div 
                  key={index}
                  ref={reelRefs[index]}
                  className={`reel ${spinningReels[index] ? 'spinning' : ''}`}
                >
                  <img 
                    src={slotImages[symbol]} 
                    alt={symbol}
                    className="symbol-image"
                  />
                </div>
              ))}
            </div>

            {resultMessage && (
              <div className={`result-message ${resultMessage.includes('CONGRATULATIONS') ? 'win' : 'lose'}`}>
                {resultMessage}
              </div>
            )}
          </div>

          {/* Lever Control */}
          <div className="lever-container">
            <button 
              className={`lever ${isSpinning ? 'pulled' : ''}`}
              onClick={spin}
              disabled={isSpinning}
              title="Pull the lever to spin!"
            >
              <div className="lever-handle"></div>
              <div className="lever-ball"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotMachineOverlay;
