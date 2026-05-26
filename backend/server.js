const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createApp } = require('./app');
const { warnInsecureJwtSecret } = require('./utils/envSecurity');

dotenv.config();
warnInsecureJwtSecret();

const PORT = process.env.PORT || 5001;
const { app, server, io } = createApp();

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bitirme';
  await mongoose.connect(mongoUri);
  console.log('MongoDB bağlantısı başarılı');
}

if (require.main === module) {
  console.log('\nBackend başlatılıyor...');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PORT: ${PORT}`);

  connectDB()
    .then(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Sunucu http://localhost:${PORT}`);
        console.log(io ? 'Socket.io aktif' : 'Socket.io devre dışı');
      });
    })
    .catch((err) => {
      console.error('MongoDB bağlantı hatası:', err.message);
      process.exit(1);
    });
}

module.exports = { app, server, io, connectDB };
