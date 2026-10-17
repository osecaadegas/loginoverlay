// Server-only release history. Add entries here as part of each user-facing release.
export const releaseNotes = [
  {
    id: 'candy-chat-space-2026-10-17', date: '2026-10-17', category: 'overlays',
    title: 'More room for Candy chat',
    summary: 'Smaller decorations and a higher giveaway card leave more space for messages.',
    changes: ['The Candy chat jar is half its previous size, with a matching reduction in reserved space.', 'Embedded winner cards align near the top and use a more compact default height; custom height and spacing settings remain available.', 'Provider logos use black ink on Candy current-game and RTP surfaces.'],
    action: 'Refresh the editor and your OBS Browser Source. These presentation changes apply to Candy only.',
  },
  {
    id: 'candy-readability-2026-10-17', date: '2026-10-17', category: 'overlays',
    title: 'Clearer Candy readouts and result cards',
    summary: 'Compact RTP bars fit their frames and pale panels use stronger text contrast.',
    changes: ['RTP text, badges and provider logos fit and align vertically inside compact Candy frames.', 'Bonus Hunt headings, slot details and list values use dark-purple text on pale surfaces.', 'Best/worst cards use coordinated mint and pink surfaces with darker values.', 'Giveaway, Bingo and tournament text treatments have been refined for readability.'],
    action: 'Refresh the editor and your OBS Browser Source. If an older custom appearance still uses white text, select Candy again to refresh its colour defaults, then save and publish. Custom element settings remain editable.',
  },
  {
    id: 'candy-theme-2026-10-17', date: '2026-10-17', category: 'overlays',
    title: 'Candy arrives in the Overlay Editor',
    summary: 'Glossy pink, cyan and purple frames with a candy-shop environment.',
    changes: ['Candy is available in the existing widget colour-theme selector.', 'The reference layout groups Bonus Hunt, requests and slot history into separate panels.', 'Background, supported candy decorations and optional gentle motion can be configured independently.', 'Existing widget data, media and editor positioning remain available.'],
    action: 'Choose Candy under Colour Theme, then use Candy reference layout in the editor toolbar to arrange the reference widgets. Additional widgets keep their existing positions. Configure the Candy environment controls on each widget, save and publish to update your browser source.',
  },
  {
    id: 'updates-page-2026-10-17', date: '2026-10-17', category: 'website',
    title: 'Your product updates, in one place',
    summary: 'A dedicated updates page for Premium members.',
    changes: ['Browse website, overlay and ScreenSplit Browser releases.', 'Filter by product or search the release history.', 'Find any installation or refresh steps alongside each update.'],
  },
  {
    id: 'slot-window-0-1-16', date: '2026-10-17', category: 'overlays', version: 'Browser 0.1.16',
    title: 'Slot Window keeps the game in proportion',
    summary: 'Captured slots fit the widget without stretching or automatic cropping.',
    changes: ['Source dimensions are reported by ScreenSplit and followed when the widget resizes.', 'Unused space stays transparent.', 'Independent corner masks remain available in the editor and browser-source output.'],
    action: 'Install ScreenSplit Browser 0.1.16 or later, restart it, then refresh the OBS Browser Source.',
    link: { label: 'Download Browser 0.1.16', url: 'https://github.com/osecaadegas/loginoverlay/releases/download/screensplit-browser-v0.1.16/StreamersCenterBrowserSetup-0.1.16.exe' },
  },
  {
    id: 'camera-performance-0-1-15', date: '2026-10-17', category: 'browser', version: '0.1.15',
    title: 'Less repeated work in the camera relay',
    summary: 'The relay and camera effects process fresh frames instead of repeatedly processing the same image.',
    changes: ['ScreenSplit reuses its capture canvas and avoids repeated connection-status updates.', 'Idle overlay cameras render when a new relay frame arrives.', 'Ice Shatter and Money Explosion retain their animation settings and reconstruction.'],
    action: 'Install ScreenSplit Browser 0.1.15 or later and refresh the OBS Browser Source. Actual resource savings depend on your streaming setup.',
  },
  {
    id: 'camera-sources-0-1-14', date: '2026-10-17', category: 'browser', version: '0.1.14',
    title: 'Choose your camera relay source',
    summary: 'Select a physical or virtual camera directly in ScreenSplit.',
    changes: ['Camera source selection includes virtual cameras such as NVIDIA Broadcast.', 'Camera relay controls appear above the browser screens.'],
    action: 'Open Camera relay in ScreenSplit, start the relay, then select your camera source. Keep ScreenSplit running while using the OBS widget.',
  },
];
