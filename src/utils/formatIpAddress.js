/**
 * formatIpAddress.js — Format IP addresses for display in analytics dashboards.
 * 
 * Features:
 * - Shortens long IPv6 addresses to first 4 segments for readability
 * - Leaves IPv4 addresses unchanged
 * - Adds tooltip with full address on hover
 */

/**
 * Detect if an IP address is IPv6
 * @param {string} ip - IP address string
 * @returns {boolean}
 */
export function isIPv6(ip) {
  if (!ip) return false;
  return ip.includes(':') && !ip.includes('.');
}

/**
 * Shorten IPv6 address for display
 * Shows first 4 segments + ellipsis for long addresses
 * @param {string} ip - IPv6 address
 * @returns {string} - Shortened version
 */
export function shortenIPv6(ip) {
  if (!ip || !isIPv6(ip)) return ip;
  
  const segments = ip.split(':');
  if (segments.length <= 4) return ip;
  
  // Show first 4 segments + ellipsis
  return `${segments.slice(0, 4).join(':')}...`;
}

/**
 * Format IP address for display with optional shortening
 * @param {string} ip - IP address (v4 or v6)
 * @param {object} options - Formatting options
 * @param {boolean} options.shorten - Whether to shorten IPv6 addresses (default: true)
 * @returns {string}
 */
export function formatIpAddress(ip, { shorten = true } = {}) {
  if (!ip) return '—';
  
  if (isIPv6(ip) && shorten) {
    return shortenIPv6(ip);
  }
  
  return ip;
}

/**
 * Get IP address type label
 * @param {string} ip
 * @returns {string} - 'IPv4', 'IPv6', or 'Unknown'
 */
export function getIpType(ip) {
  if (!ip) return 'Unknown';
  if (isIPv6(ip)) return 'IPv6';
  if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return 'IPv4';
  return 'Unknown';
}

/**
 * React component wrapper for IP address display with tooltip
 * @param {object} props
 * @param {string} props.ip - IP address to display
 * @param {boolean} props.showType - Show IP type badge (default: false)
 * @param {object} props.style - Additional inline styles
 */
export function IpAddressDisplay({ ip, showType = false, style = {} }) {
  const shortened = formatIpAddress(ip);
  const type = getIpType(ip);
  const isShortened = shortened !== ip && shortened !== '—';
  
  return (
    <span
      title={isShortened ? `Full IP: ${ip}\nType: ${type}` : `Type: ${type}`}
      style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#94a3b8',
        cursor: isShortened ? 'help' : 'default',
        ...style,
      }}
    >
      {shortened}
      {showType && (
        <span
          style={{
            marginLeft: 6,
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 600,
            background: type === 'IPv6' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
            color: type === 'IPv6' ? '#c4b5fd' : '#93c5fd',
          }}
        >
          {type}
        </span>
      )}
    </span>
  );
}
