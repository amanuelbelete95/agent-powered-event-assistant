import config from '../config.js';

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.serviceToken) {
    headers['Authorization'] = `Bearer ${config.serviceToken}`;
  }
  return headers;
}

export async function callApi<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const url = `${config.expressApiUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}