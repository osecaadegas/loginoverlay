import PenaltyKingOverlay from '../../PenaltyKing/PenaltyKingOverlay';

/**
 * Thin wrapper that satisfies the overlay widget contract.
 * The overlay receives `config` from the widget's stored JSONB.
 */
export default function PenaltyKingWidget({ config = {} }) {
  return <PenaltyKingOverlay config={config} />;
}
