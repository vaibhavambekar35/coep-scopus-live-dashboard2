// Vercel Serverless Function for Secure Scopus API Gateway
// Keeps SCOPUS_API_KEY secret on the Vercel backend server
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.SCOPUS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'SCOPUS_API_KEY environment variable is missing.',
      message: 'Please set SCOPUS_API_KEY in Vercel Project Settings -> Environment Variables.'
    });
  }

  try {
    const { query = 'AF-ID(60007233)' } = req.query;
    const response = await fetch(`https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(query)}&count=25`, {
      headers: {
        'Accept': 'application/json',
        'X-ELS-APIKey': apiKey
      }
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Scopus API', details: error.message });
  }
}
