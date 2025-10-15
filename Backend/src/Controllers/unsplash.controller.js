const axios = require("axios");

const UNSPLASH_API_BASE = process.env.UNSPLASH_API_BASE || "https://api.unsplash.com";

async function searchPhotos(req, res) {
  try {
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      return res.status(500).json({
        error: "Missing UNSPLASH_ACCESS_KEY env variable on server",
      });
    }
    const query = req.query.q;
    const page = parseInt(req.query.page || "1", 10);
    const perPage = Math.min(parseInt(req.query.per_page || "12", 10), 30);

    if (!query) {
      return res.status(400).json({ error: "Missing required query parameter 'q'" });
    }

    const response = await axios.get(`${UNSPLASH_API_BASE}/search/photos`, {
      params: { query, page, per_page: perPage },
      headers: {
        "Accept-Version": "v1",
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    // Return only necessary fields to the frontend
    const results = (response.data.results || []).map((p) => ({
      id: p.id,
      alt_description: p.alt_description,
      description: p.description,
      urls: p.urls, // contains thumb, small, regular, etc.
      user: p.user ? { name: p.user.name, username: p.user.username } : null,
      links: p.links, // includes download_location for attribution logging
    }));

    res.json({ total: response.data.total, total_pages: response.data.total_pages, results });
  } catch (err) {
    const status = err.response?.status || 500;
    const upstream = err.response?.data;
    const message = upstream?.errors?.[0] || upstream?.error || err.message || "Failed to fetch photos";
    // Log for server diagnostics
    console.error("Unsplash search error:", {
      status,
      message,
      data: upstream,
    });
    res.status(status).json({ error: message });
  }
}

async function registerDownload(req, res) {
  try {
    const { photoId } = req.params;
    if (!photoId) {
      return res.status(400).json({ error: "Missing photoId" });
    }

    const response = await axios.get(`${UNSPLASH_API_BASE}/photos/${photoId}/download`, {
      headers: {
        "Accept-Version": "v1",
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data || { error: "Failed to register download" };
    res.status(status).json(message);
  }
}

module.exports = { searchPhotos, registerDownload };


