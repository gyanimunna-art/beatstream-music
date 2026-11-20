module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = String(req.query.q || req.query.query || '').trim();
  if (!query) {
    return res.status(200).json({ ok: true, results: [] });
  }

  const endpoints = [
    `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=20`,
    `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=20`,
    `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}&limit=20`,
    `https://jiosaavn-api-2-harsh-patel.vercel.app/api/search/songs?query=${encodeURIComponent(query)}&limit=20`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!response.ok) continue;

      const json = await response.json();
      const rawList = json?.data?.results || json?.results || [];
      if (!Array.isArray(rawList) || rawList.length === 0) continue;

      const results = rawList.map((item) => {
        const dl = item.downloadUrl || [];
        const getUrl = (q) => {
          const found = dl.find((d) => String(d.quality).includes(q));
          return found ? (found.url || found.link || '') : '';
        };
        const fallbackUrl = dl.length ? (dl[dl.length - 1].url || dl[dl.length - 1].link || '') : '';

        const imgs = item.image || [];
        const imgUrl = imgs.length ? (imgs[imgs.length - 1].url || imgs[imgs.length - 1].link || '') : '';

        let artist = 'Unknown Artist';
        if (item.artists?.primary?.length) {
          artist = item.artists.primary.map((a) => a.name).join(', ');
        } else if (item.primaryArtists) {
          artist = item.primaryArtists;
        }

        return {
          id: String(item.id || Math.random()),
          title: item.name || item.title || 'Unknown Track',
          artist,
          album: item.album?.name || '',
          duration: Number(item.duration) || 0,
          image: imgUrl,
          urls: {
            '96': getUrl('96') || fallbackUrl,
            '160': getUrl('160') || fallbackUrl,
            '320': getUrl('320') || fallbackUrl
          }
        };
      }).filter((t) => t.urls['96'] || t.urls['160'] || t.urls['320']);

      if (results.length > 0) {
        return res.status(200).json({ ok: true, results });
      }
    } catch (err) {
      continue;
    }
  }

  return res.status(502).json({ ok: false, error: 'All upstream audio APIs failed', results: [] });
};
