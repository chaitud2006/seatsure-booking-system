const mongoose = require('mongoose');
const Seat = require('./models/Seat');

// Standard Atlas Connection (Bypasses SRV lookup issues)
const MONGO_URI = 'mongodb://dinnepallichaithra_db_user:seatsure123@cluster0-shard-00-00.3oavtth.mongodb.net:27017,cluster0-shard-00-01.3oavtth.mongodb.net:27017,cluster0-shard-00-02.3oavtth.mongodb.net:27017/seatsure?ssl=true&replicaSet=atlas-3oavtth-shard-0&authSource=admin&retryWrites=true&w=majority';

const seed = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    await Seat.deleteMany({});

    const tiers = ['VIP', 'PREM', 'STD'];
    const seats = [];

    for (let i = 1; i <= 30; i++) {
      seats.push({
        seatNumber: `A${i}`,
        tier: tiers[i % 3],
        price: i % 3 === 0 ? 150 : i % 3 === 1 ? 100 : 50,
        status: 'AVAILABLE'
      });
    }

    await Seat.insertMany(seats);
    console.log('Seeded 30 seats successfully to MongoDB Atlas!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();