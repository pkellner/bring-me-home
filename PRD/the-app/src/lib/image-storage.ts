// Re-export from new image storage module for backward compatibility
export {
  ImageStorageService,
  processAndStoreImage,
  getImage,
  deleteImage,
  processImageBuffer,
  type ImageData,
} from './image-storage/index';