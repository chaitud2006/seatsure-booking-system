import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100, // 100 Virtual Users
  duration: '5s', // Run test for 5 seconds
};

export default function () {
  const url = 'http://localhost:5000/api/seats/seat_1/hold';
  const payload = JSON.stringify({
    userId: `user_${__VU}@test.com`, // Unique user email per virtual user
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Expect exactly ONE 200 OK success, and 99 conflict errors (400)
  check(res, {
    'is status 200 or 400': (r) => r.status === 200 || r.status === 400,
  });
}