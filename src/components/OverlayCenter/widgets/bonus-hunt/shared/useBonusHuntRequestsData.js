import { useSlotRequestsData } from '../../slot-requests/shared/useSlotRequestsData.js';

export function useBonusHuntRequestsData({ config = {}, userId, enabled = true } = {}) {
  return useSlotRequestsData({
    config: {
      ...config,
      maxDisplay: Number(config.maxDisplay) > 0 ? Number(config.maxDisplay) : 20,
    },
    userId,
    enabled,
    channelPrefix: 'bh-sr-widget',
  });
}

export default useBonusHuntRequestsData;
