function resolveFallbackApiBaseUrl() {
  const hostname = globalThis.window?.location?.hostname || "";
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(hostname);

  if (isLocalhost) {
    return "http://localhost:3001";
  }

  return "http://132.248.44.4:3009";
}

export const defaultApiBaseUrl =
  globalThis.window?.BADGES_CONFIG?.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  resolveFallbackApiBaseUrl();

export async function apiRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" ? data.error : data;
    throw new Error(message || `HTTP ${response.status}`);
  }

  return data;
}
