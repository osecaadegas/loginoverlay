import BonusHuntWidget from '../widgets/BonusHuntWidget/BonusHuntWidget';
import SessionStatsWidget from '../widgets/SessionStatsWidget/SessionStatsWidget';
import RecentWinsWidget from '../widgets/RecentWinsWidget/RecentWinsWidget';
import TournamentsWidget from '../widgets/TournamentsWidget/TournamentsWidget';
import CoinFlipWidget from '../widgets/CoinFlipWidget/CoinFlipWidget';
import SlotmachineWidget from '../widgets/SlotmachineWidget/SlotmachineWidget';
import RandomSlotPickerWidget from '../widgets/RandomSlotPickerWidget/RandomSlotPickerWidget';
import WheelOfNamesWidget from '../widgets/WheelOfNamesWidget/WheelOfNamesWidget';
import NavbarWidget from '../widgets/NavbarWidget/NavbarWidget';
import ChatWidget from '../widgets/ChatWidget/ChatWidget';
import CustomizationWidget from '../widgets/CustomizationWidget/CustomizationWidget';

export default function WidgetSettingsTab({ overlay, updateSettings, slots }) {
  return (
    <div className="tab-content">
      <div className="widget-controls">
        <BonusHuntWidget overlay={overlay} updateSettings={updateSettings} slots={slots} />
        <SessionStatsWidget overlay={overlay} updateSettings={updateSettings} />
        <RecentWinsWidget overlay={overlay} updateSettings={updateSettings} />
        <TournamentsWidget overlay={overlay} updateSettings={updateSettings} />
        <CoinFlipWidget overlay={overlay} updateSettings={updateSettings} />
        <SlotmachineWidget overlay={overlay} updateSettings={updateSettings} />
        <RandomSlotPickerWidget overlay={overlay} updateSettings={updateSettings} />
        <WheelOfNamesWidget overlay={overlay} updateSettings={updateSettings} />
        <NavbarWidget overlay={overlay} updateSettings={updateSettings} />
        <ChatWidget overlay={overlay} updateSettings={updateSettings} />
        <CustomizationWidget overlay={overlay} updateSettings={updateSettings} />
      </div>
    </div>
  );
}
