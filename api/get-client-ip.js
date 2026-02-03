// API endpoint to get client IP address
// This runs server-side to get the real IP (not just client-reported)

export default async function handler(req, res) {
  // Get IP from request headers (handles proxies and load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : req.socket.remoteAddress;

  // Also check for Cloudflare IP
  const cfIP = req.headers['cf-connecting-ip'];
  const realIP = cfIP || ip;

  return res.status(200).json({ 
    ip: realIP,
    forwarded: forwarded,
    cfIP: cfIP
  });
}
