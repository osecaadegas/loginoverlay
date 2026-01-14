import { useState, useEffect } from 'react';
import { getAllSlots } from '../../../../utils/slotUtils';
import TournamentModal from './TournamentModal';

export default function TournamentsWidget({ overlay, updateSettings }) {
  const [showModal, setShowModal] = useState(false);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const loadSlots = async () => {
      try {
        const data = await getAllSlots();
        setSlots(data || []);
      } catch (error) {
        console.error('Error loading slots:', error);
        setSlots([]);
      }
    };
    if (showModal) {
      loadSlots();
    }
  }, [showModal]);

  return (
    <>
      <div className="widget-card">
        <div className="widget-card-header">
          <h3>🏆 Tournaments</h3>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={overlay.settings.widgets?.tournaments?.enabled ?? false}
              onChange={(e) => {
                const newSettings = {
                  ...overlay.settings,
                  widgets: {
                    ...overlay.settings.widgets,
                    tournaments: {
                      ...overlay.settings.widgets.tournaments,
                      enabled: e.target.checked
                    }
                  }
                };
                updateSettings(newSettings);
              }}
            />
            <span className="slider"></span>
          </label>
        </div>
        <p className="widget-description">Run slot tournaments with bracket system</p>
        {overlay.settings.widgets?.tournaments?.enabled && (
          <button className="widget-configure-btn" onClick={() => setShowModal(true)}>
            ⚙️ Configure Tournament
          </button>
        )}
      </div>

      {showModal && (
        <TournamentModal
          overlay={overlay}
          onClose={() => setShowModal(false)}
          slots={slots}
          updateSettings={updateSettings}
        />
      )}
    </>
  );
}
