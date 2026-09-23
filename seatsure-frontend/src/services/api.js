import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:5000/api';

// Socket initialization
export const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

// Seat Endpoints
export const getSeats = () => axios.get(`${API_BASE_URL}/seats`);

export const holdSeat = (seatId, userId) => {
  return axios.post(`${API_BASE_URL}/seats/${seatId}/hold`, { userId });
};

export const confirmSeat = (seatId, userId, userEmail) => {
  return axios.post(`${API_BASE_URL}/seats/${seatId}/confirm`, {
    userId,
    userEmail,
  });
};

export const seedSeats = () => axios.post(`${API_BASE_URL}/seats/seed`);

// Auth Endpoints
export const loginUser = (credentials) =>
  axios.post(`${API_BASE_URL}/auth/login`, credentials);

export const registerUser = (userData) =>
  axios.post(`${API_BASE_URL}/auth/register`, userData);
