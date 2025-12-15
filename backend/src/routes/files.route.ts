import { Router } from 'express';
import multer from 'multer';
import { requireAuthAndActive } from '../middleware/auth.js';
import { FilesController } from '../controllers/filesController.js';

const router = Router();

router.use(requireAuthAndActive);

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
    }
  }
});

router.post('/upload', upload.single('file'), FilesController.upload);

router.get('/:id', FilesController.download);

router.delete('/:id', FilesController.delete);

export default router;
