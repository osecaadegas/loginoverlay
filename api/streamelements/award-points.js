export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, points } = req.body;

    if (!username || !points) {
      return res.status(400).json({ 
        error: 'Missing required fields: username and points' 
      });
    }

    // Get StreamElements credentials from environment variables
    const SE_JWT_TOKEN = process.env.STREAMELEMENTS_JWT_TOKEN;
    const SE_CHANNEL_ID = process.env.STREAMELEMENTS_CHANNEL_ID;

    if (!SE_JWT_TOKEN || !SE_CHANNEL_ID) {
      console.error('StreamElements credentials not configured');
      return res.status(500).json({ 
        error: 'StreamElements integration not configured. Please set STREAMELEMENTS_JWT_TOKEN and STREAMELEMENTS_CHANNEL_ID in environment variables.' 
      });
    }

    // Call StreamElements API to add points
    const response = await fetch(
      `https://api.streamelements.com/kappa/v2/points/${SE_CHANNEL_ID}/${username}/${points}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SE_JWT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('StreamElements API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to award points via StreamElements API',
        details: errorData
      });
    }

    const data = await response.json();

    return res.status(200).json({ 
      success: true,
      message: `Successfully awarded ${points} points to ${username}`,
      data
    });

  } catch (error) {
    console.error('Error awarding points:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
