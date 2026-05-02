import axios from 'axios';
import { API_BASE_URL, API_BASE_URL_CANDIDATES } from '../constants/config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const isNetworkError = !error?.response && Boolean(config);
    if (!isNetworkError) throw error;

    const currentIndex = Number.isInteger(config._apiFallbackIndex)
      ? config._apiFallbackIndex
      : API_BASE_URL_CANDIDATES.indexOf(config.baseURL || API_BASE_URL);
    const nextIndex = currentIndex + 1;
    const nextBaseUrl = API_BASE_URL_CANDIDATES[nextIndex];

    if (!nextBaseUrl) throw error;

    config._apiFallbackIndex = nextIndex;
    config.baseURL = nextBaseUrl;
    return client.request(config);
  }
);

export default client;
