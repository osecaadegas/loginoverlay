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

    console.log('📥 Award points request received:', { username, points });

    if (!username || points === undefined || points === null) {
      console.error('❌ Missing required fields:', { username, points });
      return res.status(400).json({ 
        error: 'Missing required fields: username and points' 
      });
    }

    // Validate points is a positive number
    const pointsNum = parseInt(points, 10);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      console.error('❌ Invalid points value:', points);
      return res.status(400).json({ 
        error: 'Points must be a positive number' 
      });
    }

    // Get StreamElements credentials from environment variables (support both naming conventions)
    const SE_JWT_TOKEN = process.env.STREAMELEMENTS_JWT_TOKEN || process.env.VITE_SE_JWT_TOKEN;
    const SE_CHANNEL_ID = process.env.STREAMELEMENTS_CHANNEL_ID || process.env.VITE_SE_CHANNEL_ID;

    if (!SE_JWT_TOKEN || !SE_CHANNEL_ID) {
      console.error('❌ StreamElements credentials not configured');
      console.error('SE_JWT_TOKEN:', SE_JWT_TOKEN ? 'SET' : 'MISSING');
      console.error('SE_CHANNEL_ID:', SE_CHANNEL_ID ? 'SET' : 'MISSING');
      return res.status(500).json({ 
        error: 'StreamElements integration not configured. Please set STREAMELEMENTS_JWT_TOKEN and STREAMELEMENTS_CHANNEL_ID in environment variables.' 
      });
    }

    // Clean the username (remove @ if present, trim whitespace)
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    
    console.log('📡 Calling StreamElements API:', {
      channelId: SE_CHANNEL_ID,
      username: cleanUsername,
      points: pointsNum
    });

    // Call StreamElements API to add points
    const response = await fetch(
      `https://api.streamelements.com/kappa/v2/points/${SE_CHANNEL_ID}/${cleanUsername}/${pointsNum}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SE_JWT_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('❌ StreamElements API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return res.status(response.status).json({ 
        error: 'Failed to award points via StreamElements API',
        details: errorData
      });
    }

    const data = await response.json();
    console.log('✅ StreamElements API success:', data);

    return res.status(200).json({ 
      success: true,
      message: `Successfully awarded ${pointsNum} points to ${cleanUsername}`,
      data
    });

  } catch (error) {
    console.error('❌ Error awarding points:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
