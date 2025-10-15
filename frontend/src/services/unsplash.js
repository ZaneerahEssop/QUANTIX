const API_URL = process.env.REACT_APP_API_URL;

export async function searchUnsplashPhotos(query, page = 1, perPage = 12) {
  const url = `${API_URL}/api/unsplash/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to search Unsplash");
  }
  return res.json();
}

export async function registerUnsplashDownload(photoId) {
  const url = `${API_URL}/api/unsplash/photos/${photoId}/download`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to register download");
  }
  return res.json();
}


