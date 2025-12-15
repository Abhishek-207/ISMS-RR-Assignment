import mongoose from 'mongoose';
import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/isms';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to Database');

    app.listen(PORT, () => {
      console.log(`Server running → On PORT : ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
