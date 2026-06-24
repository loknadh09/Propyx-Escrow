const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const handleResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response, got ${contentType || "unknown content type"}`);
  }

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data.error || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMessage);
  }

  return data;
};

export async function post(path, body, token) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    return await handleResponse(res);
  } catch (error) {
    console.error(`POST ${path} failed:`, error.message);
    throw error;
  }
}

export async function get(path, token) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return await handleResponse(res);
  } catch (error) {
    console.error(`GET ${path} failed:`, error.message);
    throw error;
  }
}

export async function put(path, body, token) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    return await handleResponse(res);
  } catch (error) {
    console.error(`PUT ${path} failed:`, error.message);
    throw error;
  }
}

export async function postNoBody(path, token) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return await handleResponse(res);
  } catch (error) {
    console.error(`POST ${path} (no body) failed:`, error.message);
    throw error;
  }
}
