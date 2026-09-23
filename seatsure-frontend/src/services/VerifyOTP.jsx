const handleVerifyOTP = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (response.ok) {
      // 1. Save user info and JWT token directly to localStorage
      localStorage.setItem('userInfo', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      // 2. Redirect straight to Seat Map (bypassing Login screen completely)
      navigate('/seats'); 
    } else {
      alert(data.message || 'Verification failed');
    }
  } catch (error) {
    console.error('OTP Verification Error:', error);
  }
};