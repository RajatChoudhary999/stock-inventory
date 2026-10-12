import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({ baseURL, withCredentials: true });

// Access token is held in memory (not localStorage) to reduce XSS exposure.
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, try one silent refresh, then retry the original request.
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing =
          refreshing ??
          api.post('/auth/refresh').then((r) => {
            setAccessToken(r.data.accessToken);
            return r.data.accessToken as string;
          });
        const token = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setAccessToken(null);
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);
