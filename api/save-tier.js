module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { player } = req.body;
  const GITHUB_OWNER = 'PrestonSupF';
  const GITHUB_REPO = 'ControllerTiers';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server GitHub token is not configured in Vercel.' });
  }

  const filePath = `tierlist/${player.name.toLowerCase()}.json`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  
  const jsonString = JSON.stringify(player, null, 2);
  const contentBase64 = Buffer.from(jsonString).toString('base64');

  try {
    let sha = null;
    const checkRes = await fetch(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'ControllerPvP-App' }
    });

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      sha = checkData.sha;
    }

    const body = {
      message: `Update tier data for ${player.name}`,
      content: contentBase64,
      ...(sha && { sha })
    };

    const saveRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ControllerPvP-App'
      },
      body: JSON.stringify(body)
    });

    if (saveRes.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errData = await saveRes.json();
      return res.status(500).json({ error: errData.message || 'GitHub API error' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
