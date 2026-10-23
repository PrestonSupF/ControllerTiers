module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const player = bodyData?.player;

    if (!player || !player.name) {
      return res.status(400).json({ error: 'Missing player data in request body.' });
    }

    const GITHUB_OWNER = 'PrestonSupF';
    const GITHUB_REPO = 'ControllerTiers';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub Error: Server GitHub token is not configured in Vercel.' });
    }

    const headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ControllerPvP-App',
      'Accept': 'application/vnd.github.v3+json'
    };

    // 1. Save individual player file
    const filePath = `tierlist/${player.name.toLowerCase()}.json`;
    const fileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    
    let fileSha = null;
    const checkRes = await fetch(fileUrl, { headers });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      fileSha = checkData.sha;
    }

    const playerCommit = await fetch(fileUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Update tier data for ${player.name}`,
        content: Buffer.from(JSON.stringify(player, null, 2)).toString('base64'),
        ...(fileSha && { sha: fileSha })
      })
    });

    if (!playerCommit.ok) {
      const errJson = await playerCommit.json();
      throw new Error(`GitHub Player Commit Failed: ${errJson.message || playerCommit.statusText}`);
    }

    // 2. Update master roster.json file
    const rosterPath = 'roster.json';
    const rosterUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${rosterPath}`;
    
    let rosterSha = null;
    let playersList = [];
    
    const rosterCheck = await fetch(rosterUrl, { headers });
    if (rosterCheck.ok) {
      const rosterData = await rosterCheck.json();
      rosterSha = rosterData.sha;
      try {
        const decoded = JSON.parse(Buffer.from(rosterData.content, 'base64').toString('utf8'));
        if (Array.isArray(decoded)) playersList = decoded;
      } catch (e) {
        playersList = [];
      }
    }

    const index = playersList.findIndex(p => p.name.toLowerCase() === player.name.toLowerCase());
    if (index >= 0) {
      playersList[index] = player;
    } else {
      playersList.push(player);
    }

    const rosterCommit = await fetch(rosterUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Update master roster for ${player.name}`,
        content: Buffer.from(JSON.stringify(playersList, null, 2)).toString('base64'),
        ...(rosterSha && { sha: rosterSha })
      })
    });

    if (!rosterCommit.ok) {
      const errJson = await rosterCommit.json();
      throw new Error(`GitHub Roster Commit Failed: ${errJson.message || rosterCommit.statusText}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Serverless Exception:', err);
    return res.status(500).json({ error: err.message });
  }
};
