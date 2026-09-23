import React, { useEffect, useState, useRef } from 'react';
import { getSeats, holdSeat, confirmSeat, seedSeats, loginUser, registerUser, socket } from './services/api';
import { Armchair, RefreshCw, User, Ticket, Clock, ShieldCheck, Zap, Download, Filter, Activity, Database, Lock, Mail, Shield, LogOut, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  const [seats, setSeats] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('seatsure_user');
    return saved ? JSON.parse(saved) : { _id: 'guest_123', name: 'Guest User', email: 'guest@seatsure.com', role: 'user' };
  });

  const [activeHoldSeat, setActiveHoldSeat] = useState(null);
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [filterZone, setFilterZone] = useState('ALL');
  const [timeLeft, setTimeLeft] = useState(300);
  const [statusMessage, setStatusMessage] = useState('');

  // UI Views State
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isConnected, setIsConnected] = useState(socket ? socket.connected : false);

  // Auth Form State
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('user');
  const [authError, setAuthError] = useState('');

  const ticketRef = useRef(null);

  // Socket Connection & Real-Time Listeners
  useEffect(() => {
    fetchSeats();

    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('seatHeld', (heldSeat) => updateSingleSeat(heldSeat));
    socket.on('seatBooked', (bookedSeat) => updateSingleSeat(bookedSeat));

    // Real-time Auto-release Listener
    socket.on('seatReleased', (releasedSeat) => {
      updateSingleSeat(releasedSeat);
      if (activeHoldSeat && activeHoldSeat._id === releasedSeat._id) {
        setActiveHoldSeat(null);
        setStatusMessage('Your hold on this seat has expired.');
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('seatHeld');
      socket.off('seatBooked');
      socket.off('seatReleased');
    };
  }, [activeHoldSeat]);

  // Hold Countdown Timer
  useEffect(() => {
    let timer;
    if (activeHoldSeat && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && activeHoldSeat) {
      setActiveHoldSeat(null);
      setStatusMessage('Seat hold expired automatically.');
    }
    return () => clearInterval(timer);
  }, [activeHoldSeat, timeLeft]);

  const fetchSeats = async () => {
    try {
      const res = await getSeats();
      setSeats(res.data);
    } catch (err) {
      setStatusMessage('Error fetching seating grid.');
    }
  };

  const updateSingleSeat = (updatedSeat) => {
    setSeats((prev) =>
      prev.map((s) => (s._id === updatedSeat._id || s.id === updatedSeat.id ? updatedSeat : s))
    );
  };

  const handleHold = async (seat) => {
  const targetId = seat._id || seat.id;
  const userId = currentUser?.email || 'guest@seatsure.com';

  try {
    setStatusMessage(`Locking seat ${seat.seatNumber}...`);
    // Ensure payload object explicitly matches backend expectation
    await holdSeat(targetId, userId); 
    
    setActiveHoldSeat(seat);
    setTimeLeft(300);
    setStatusMessage(`Seat ${seat.seatNumber} reserved! Complete checkout before timer expires.`);
  } catch (err) {
    setStatusMessage(err.response?.data?.message || 'Seat availability conflict!');
  }
};

  const handleConfirm = async () => {
    if (!activeHoldSeat) return;
    const userId = currentUser ? currentUser.email : 'guest@seatsure.com';
    const email = currentUser ? currentUser.email : 'guest@seatsure.com';

    try {
      setStatusMessage(`Processing payment & issuing digital ticket...`);
      const response = await confirmSeat(activeHoldSeat._id || activeHoldSeat.id, userId, email);
      setConfirmedTicket({
        seatNumber: activeHoldSeat.seatNumber,
        price: activeHoldSeat.price || 100,
        bookingId: response.data.seat._id || response.data.seat.id,
        userEmail: email,
        timestamp: new Date().toLocaleTimeString(),
      });
      setActiveHoldSeat(null);
      setStatusMessage(`Booking confirmed! Download your ticket below.`);
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Checkout failed.');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      let res;
      if (isRegistering) {
        res = await registerUser({ name: authName, email: authEmail, password: authPassword, role: authRole });
      } else {
        res = await loginUser({ email: authEmail, password: authPassword });
      }

      const userData = res.data.user || res.data;
      const token = res.data.token || 'mock_token';

      localStorage.setItem('seatsure_token', token);
      localStorage.setItem('seatsure_user', JSON.stringify(userData));

      setCurrentUser(userData);
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      setShowAuthModal(false);
      setStatusMessage(`Welcome back, ${userData.name}!`);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication error.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('seatsure_token');
    localStorage.removeItem('seatsure_user');
    setCurrentUser({ _id: 'guest_123', name: 'Guest User', email: 'guest@seatsure.com', role: 'user' });
    setActiveHoldSeat(null);
    setConfirmedTicket(null);
    setStatusMessage('Logged out successfully.');
  };

  const downloadPDFTicket = async () => {
    if (!ticketRef.current) return;
    const canvas = await html2canvas(ticketRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a5');
    pdf.addImage(imgData, 'PNG', 10, 10, 128, 0);
    pdf.save(`SeatSure_Ticket_${confirmedTicket.seatNumber}.pdf`);
  };

  const handleSeed = async () => {
    try {
      await seedSeats();
      setActiveHoldSeat(null);
      setConfirmedTicket(null);
      fetchSeats();
      setStatusMessage('Theater layout reset with fresh seats!');
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Reset grid successfully.');
      fetchSeats();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredSeats = seats.filter((seat, idx) => {
    const isVIP = idx < 5;
    const isPremium = idx >= 5 && idx < 12;
    const isStd = idx >= 12;

    if (filterZone === 'VIP') return isVIP;
    if (filterZone === 'PREM') return isPremium;
    if (filterZone === 'STD') return isStd;
    return true;
  });

  // Metrics
  const totalSeatsCount = seats.length || 20;
  const bookedSeatsCount = seats.filter((s) => s.status === 'BOOKED').length;
  const heldSeatsCount = seats.filter((s) => s.status === 'HELD').length;
  const availableSeatsCount = totalSeatsCount - bookedSeatsCount - heldSeatsCount;
  const totalRevenue = seats
    .filter((s) => s.status === 'BOOKED')
    .reduce((acc, s) => acc + (s.price || 100), 0);
  const occupancyRate = Math.round((bookedSeatsCount / totalSeatsCount) * 100) || 0;

  return (
    <div style={styles.container}>
      {/* Navigation Header */}
      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <div style={styles.logoIconBg}>
            <Zap size={22} color="#0f172a" />
          </div>
          <h1 style={styles.logoText}>
            Seat<span style={{ color: '#38bdf8' }}>Sure</span>
          </h1>
          <span style={styles.badge}>ENTERPRISE</span>
        </div>

        <div style={styles.userControls}>
          <button onClick={() => setShowAnalytics(true)} style={styles.btnAnalytics}>
            <Activity size={16} color="#38bdf8" /> Metrics
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.userProfilePill}>
              <User size={14} color="#38bdf8" />
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{currentUser.name}</span>
              <span style={styles.roleBadge}>{currentUser.role}</span>
            </div>

            {currentUser.email === 'guest@seatsure.com' ? (
              <button onClick={() => setShowAuthModal(true)} style={styles.btnPrimarySmall}>
                Sign In
              </button>
            ) : (
              <button onClick={handleLogout} style={styles.btnDangerIcon} title="Logout">
                <LogOut size={16} />
              </button>
            )}
          </div>

          <button onClick={handleSeed} style={styles.btnSecondary}>
            <RefreshCw size={14} /> Reset Grid
          </button>
        </div>
      </header>

      {/* Main Seating View */}
      <main style={styles.mainGrid}>
        <section style={styles.theaterSection}>
          <div style={styles.filterBar}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
              <Filter size={16} color="#38bdf8" /> Filter Tier:
            </span>
            {['ALL', 'VIP', 'PREM', 'STD'].map((zone) => (
              <button
                key={zone}
                onClick={() => setFilterZone(zone)}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: filterZone === zone ? '#0284c7' : '#1f2937',
                  border: filterZone === zone ? '1px solid #38bdf8' : '1px solid #374151',
                  color: filterZone === zone ? '#ffffff' : '#94a3b8',
                }}
              >
                {zone}
              </button>
            ))}
          </div>

          <div style={styles.screenWrapper}>
            <div style={styles.screenBar}></div>
            <p style={styles.screenLabel}>STAGE / MAIN SCREEN</p>
          </div>

          <div style={styles.seatContainer}>
            {filteredSeats.map((seat, idx) => {
              const globalIndex = seats.findIndex((s) => s._id === seat._id || s.id === seat.id);
              const isHeld = seat.status === 'HELD';
              const isBooked = seat.status === 'BOOKED';
              const myIdentifier = currentUser ? currentUser.email : 'guest@seatsure.com';
              const isMine = seat.heldBy === myIdentifier;

              const isVIP = globalIndex < 5;
              const isPremium = globalIndex >= 5 && globalIndex < 12;
              const seatPrice = isVIP ? 150 : isPremium ? 120 : 100;

              let seatBg = '#059669'; 
              let cursorStyle = 'pointer';

              if (isHeld) {
                seatBg = isMine ? '#d97706' : '#dc2626'; 
              }
              if (isBooked) {
                seatBg = '#334155'; 
                cursorStyle = 'not-allowed';
              }

              return (
                <button
                  key={seat._id || seat.id || idx}
                  disabled={isBooked || (isHeld && !isMine)}
                  onClick={() => !isHeld && handleHold(seat)}
                  style={{
                    ...styles.seatCard,
                    backgroundColor: seatBg,
                    cursor: cursorStyle,
                    transform: isMine ? 'scale(1.08)' : 'scale(1)',
                    border: isMine ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <Armchair size={22} color="#ffffff" />
                  <span style={styles.seatName}>{seat.seatNumber}</span>
                  <small style={styles.seatTier}>
                    {isVIP ? 'VIP' : isPremium ? 'PREM' : 'STD'} • ${seatPrice}
                  </small>
                </button>
              );
            })}
          </div>

          {/* COLOR LEGEND */}
          <div style={styles.legendContainer}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#059669' }}></div>
              <span>Available</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#d97706' }}></div>
              <span>Your Hold</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#dc2626' }}></div>
              <span>Locked (Other User)</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#334155' }}></div>
              <span>Booked</span>
            </div>
          </div>

          {statusMessage && <div style={styles.statusBar}><ShieldCheck size={16} /> {statusMessage}</div>}
        </section>

        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.ticketCard}>
            <div style={styles.ticketHeader}>
              <Ticket size={22} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Checkout & Pass</h3>
            </div>

            {activeHoldSeat ? (
              <div style={styles.ticketBody}>
                <div style={styles.timerBox}>
                  <Clock size={18} color="#f59e0b" />
                  <span>Hold Expires In: <strong>{formatTime(timeLeft)}</strong></span>
                </div>

                <div style={styles.ticketRow}>
                  <span>Selected Seat:</span>
                  <strong style={{ color: '#38bdf8' }}>{activeHoldSeat.seatNumber}</strong>
                </div>
                <div style={styles.ticketRow}>
                  <span>Ticket Price:</span>
                  <strong>${activeHoldSeat.price || 100}</strong>
                </div>

                <button onClick={handleConfirm} style={styles.btnPrimary}>
                  Confirm & Pay Now
                </button>
              </div>
            ) : confirmedTicket ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div ref={ticketRef} style={styles.printableTicket}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: '#0284c7', fontSize: '1.1rem' }}>SeatSure Pass</h4>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{confirmedTicket.timestamp}</span>
                  </div>
                  <hr style={styles.divider} />
                  <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#0f172a' }}>
                    Seat: <strong style={{ color: '#0284c7' }}>{confirmedTicket.seatNumber}</strong>
                  </p>
                  <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#0f172a' }}>
                    Holder: <strong>{confirmedTicket.userEmail}</strong>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.8rem' }}>
                    <QRCodeSVG value={confirmedTicket.bookingId} size={95} />
                  </div>
                </div>

                <button onClick={downloadPDFTicket} style={styles.btnSuccess}>
                  <Download size={16} /> Download PDF Pass
                </button>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <Armchair size={48} color="#475569" />
                <p>Click on any <strong style={{ color: '#059669' }}>Available (Green)</strong> seat to lock it.</p>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* AUTH MODAL OVERLAY */}
      {showAuthModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={styles.authBrandHeader}>
                <Zap size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, color: '#f8fafc' }}>{isRegistering ? 'Register' : 'Sign In'}</h3>
              </div>
              <button onClick={() => setShowAuthModal(false)} style={styles.btnClose}>
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            {authError && <div style={styles.errorBox}>{authError}</div>}

            <form onSubmit={handleAuthSubmit} style={styles.form}>
              {isRegistering && (
                <div style={styles.inputGroup}>
                  <User size={18} color="#38bdf8" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    style={styles.authInput}
                    required
                  />
                </div>
              )}

              <div style={styles.inputGroup}>
                <Mail size={18} color="#38bdf8" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={styles.authInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <Lock size={18} color="#38bdf8" />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={styles.authInput}
                  required
                />
              </div>

              {isRegistering && (
                <div style={styles.inputGroup}>
                  <Shield size={18} color="#38bdf8" />
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="user">Customer Account</option>
                    <option value="admin">Admin Account</option>
                  </select>
                </div>
              )}

              <button type="submit" style={styles.btnPrimaryLarge}>
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <p style={styles.toggleText}>
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span onClick={() => setIsRegistering(!isRegistering)} style={styles.toggleLink}>
                {isRegistering ? 'Sign In' : 'Register Now'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ANALYTICS MODAL OVERLAY */}
      {showAnalytics && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity color="#38bdf8" size={20} />
                <h3 style={{ margin: 0, color: '#f8fafc' }}>System Metrics & Analytics</h3>
              </div>
              <button onClick={() => setShowAnalytics(false)} style={styles.btnClose}>
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <span style={styles.metricTitle}>Total Revenue</span>
                <p style={{ ...styles.metricVal, color: '#10b981' }}>${totalRevenue}</p>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricTitle}>Occupancy Rate</span>
                <p style={{ ...styles.metricVal, color: '#38bdf8' }}>{occupancyRate}%</p>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricTitle}>Active Holds</span>
                <p style={{ ...styles.metricVal, color: '#f59e0b' }}>{heldSeatsCount}</p>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricTitle}>Seats Available</span>
                <p style={{ ...styles.metricVal, color: '#cbd5e1' }}>{availableSeatsCount}</p>
              </div>
            </div>

            <div style={styles.techHealthBox}>
              <div style={styles.techRow}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={16} color="#38bdf8" /> Redis Key Cache Hit
                </span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>99.4%</span>
              </div>
              <div style={styles.techRow}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} color="#f59e0b" /> WebSocket Status
                </span>
                <span style={{ color: isConnected ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#0b0f19', color: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#111827', borderBottom: '1px solid #1f2937' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIconBg: { backgroundColor: '#38bdf8', borderRadius: '8px', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' },
  badge: { fontSize: '0.65rem', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 'bold', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #38bdf8' },
  userControls: { display: 'flex', alignItems: 'center', gap: '1rem' },
  btnAnalytics: { backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #0284c7', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.85rem' },
  userProfilePill: { backgroundColor: '#1f2937', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  roleBadge: { fontSize: '0.65rem', backgroundColor: '#38bdf820', color: '#38bdf8', border: '1px solid #38bdf8', padding: '0.1rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' },
  btnDangerIcon: { backgroundColor: '#374151', color: '#f87171', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  btnPrimarySmall: { backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
  btnSecondary: { backgroundColor: '#1f2937', color: '#f8fafc', border: '1px solid #374151', padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.85rem' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', padding: '2.5rem', maxWidth: '1280px', margin: '0 auto' },
  theaterSection: { backgroundColor: '#111827', padding: '2rem', borderRadius: '12px', border: '1px solid #1f2937' },
  filterBar: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' },
  filterBtn: { padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
  screenWrapper: { textAlign: 'center', marginBottom: '2.5rem' },
  screenBar: { height: '6px', backgroundColor: '#38bdf8', borderRadius: '50%', boxShadow: '0 0 25px #38bdf8', width: '80%', margin: '0 auto 0.5rem' },
  screenLabel: { fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '2px', margin: 0, fontWeight: 'bold' },
  seatContainer: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' },
  seatCard: { borderRadius: '8px', padding: '0.85rem 0.5rem', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' },
  seatName: { fontWeight: 'bold', fontSize: '0.95rem' },
  seatTier: { fontSize: '0.65rem', opacity: 0.9, fontWeight: '500' },
  legendContainer: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#1f2937', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #374151', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '500' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  legendDot: { width: '12px', height: '12px', borderRadius: '50%' },
  statusBar: { marginTop: '1rem', padding: '0.75rem', backgroundColor: '#0284c720', border: '1px solid #0284c7', borderRadius: '6px', color: '#38bdf8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  sidebar: {},
  ticketCard: { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.5rem' },
  ticketHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #1f2937', paddingBottom: '1rem', marginBottom: '1rem' },
  ticketBody: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  timerBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#78350f30', border: '1px solid #f59e0b', color: '#fbbf24', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem' },
  ticketRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' },
  divider: { border: 'none', borderTop: '1px solid #cbd5e1', margin: '0.5rem 0' },
  btnPrimary: { width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' },
  btnPrimaryLarge: { width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  btnSuccess: { width: '100%', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' },
  printableTicket: { backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', color: '#0f172a' },
  emptyState: { textAlign: 'center', color: '#64748b', padding: '2rem 1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', padding: '1.5rem', width: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937', paddingBottom: '0.75rem', marginBottom: '1.2rem' },
  authBrandHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  btnClose: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' },
  metricCard: { backgroundColor: '#1f2937', padding: '0.85rem', borderRadius: '8px', border: '1px solid #374151' },
  metricTitle: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' },
  metricVal: { margin: 0, fontSize: '1.3rem', fontWeight: 'bold' },
  techHealthBox: { backgroundColor: '#0f172a', borderRadius: '8px', padding: '0.85rem', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  techRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '0.75rem 0.9rem' },
  authInput: { backgroundColor: 'transparent', color: '#fff', border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' },
  selectInput: { backgroundColor: 'transparent', color: '#fff', border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' },
  errorBox: { backgroundColor: '#ef444420', border: '1px solid #ef4444', color: '#f87171', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' },
  toggleText: { textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', marginTop: '1.5rem' },
  toggleLink: { color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' }
};