import { io } from 'socket.io-client';

/**
 * JWT ile kimlik doğrulamalı Socket.io bağlantısı
 * @param {string} baseURL
 * @param {string|null} token
 */
export function createAuthenticatedSocket(baseURL, token) {
  if (!token) {
    return null;
  }
  return io(baseURL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    auth: { token },
  });
}

export function getStaffSocketToken() {
  return localStorage.getItem('token');
}
