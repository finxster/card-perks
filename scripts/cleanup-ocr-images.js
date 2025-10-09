#!/usr/bin/env node

/**
 * Cleanup script for expired OCR images
 * This can be run as a cron job to clean up expired images from Cloudflare R2
 * 
 * Usage:
 * node scripts/cleanup-ocr-images.js
 * 
 * Or as a cron job:
 * 0 2 * * * cd /path/to/cardperks && node scripts/cleanup-ocr-images.js
 */

import { createR2Service } from '../server/r2-service.js';
import { storage } from '../server/storage.js';

async function cleanupExpiredImages() {
  console.log('Starting OCR image cleanup...');
  
  try {
    // Check if R2 service is configured
    let r2Service;
    try {
      r2Service = createR2Service();
    } catch (error) {
      console.log('R2 service not configured, skipping cleanup');
      return;
    }

    // Get expired images from database
    const expiredImages = await storage.getExpiredOcrImages();
    
    if (expiredImages.length === 0) {
      console.log('No expired images to clean up');
      return;
    }

    console.log(`Found ${expiredImages.length} expired images to clean up`);

    // Delete images from R2
    const keys = expiredImages.map(img => img.cloudflareKey).filter(Boolean);
    
    if (keys.length > 0) {
      const { success, failed } = await r2Service.deleteImages(keys);
      console.log(`Successfully deleted ${success.length} images from R2`);
      
      if (failed.length > 0) {
        console.log(`Failed to delete ${failed.length} images from R2`);
      }

      // Delete records from database for successfully deleted images
      for (const key of success) {
        const image = expiredImages.find(img => img.cloudflareKey === key);
        if (image) {
          await storage.deleteOcrImage(image.id);
        }
      }
    }

    // Also clean up database records for images without cloudflare keys
    const orphanedImages = expiredImages.filter(img => !img.cloudflareKey);
    for (const image of orphanedImages) {
      await storage.deleteOcrImage(image.id);
    }

    console.log(`Cleanup completed. Total cleaned: ${keys.length + orphanedImages.length} records`);

  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredImages().then(() => {
    console.log('Cleanup script finished');
    process.exit(0);
  }).catch((error) => {
    console.error('Cleanup script failed:', error);
    process.exit(1);
  });
}