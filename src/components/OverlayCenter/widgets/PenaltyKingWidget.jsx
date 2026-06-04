import { useAuth } from '../../../context/AuthContext';
import PenaltyKingOverlay from '../../PenaltyKing/PenaltyKingOverlay';

/**
 * Thin wrapper that satisfies the overlay widget contract.
 * Falls back to the logged-in user's ID if config.streamer_id isn't stored yet.
 */
export default function PenaltyKingWidget({ config = {} }) {
  const { user } = useAuth();
  const mergedConfig = { ...config, streamer_id: config.streamer_id || user?.id };
  return <PenaltyKingOverlay config={mergedConfig} />;
}
