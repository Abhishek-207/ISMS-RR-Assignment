import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });




import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/isms';
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Database Connected Successfully`);
    console.log(`Environment selected : ${NODE_ENV}`);

    app.listen(PORT, () => {
      console.log(`Server Running on PORT : ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
