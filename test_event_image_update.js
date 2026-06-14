// Test script to verify event image update functionality
const { addEventImage, getEventImages } = require('./src/repository/eventRepository');

async function testEventImageUpdate() {
  console.log('Testing event image update with old image marking as deleted...');
  
  try {
    const eventId = 'test-event-id'; // Replace with actual event ID
    
    // Test case 1: Add initial images
    console.log('\n1. Adding initial images:');
    const image1 = await addEventImage(eventId, 'https://example.com/image1.jpg', 'First image');
    const image2 = await addEventImage(eventId, 'https://example.com/image2.jpg', 'Second image');
    console.log('✓ Initial images added:', { image1, image2 });

    // Get all current images
    let currentImages = await getEventImages(eventId);
    console.log('✓ Current images count:', currentImages.length);
    console.log('✓ Current images:', currentImages.map(img => ({ id: img.id, url: img.image_url, is_deleted: img.is_deleted })));

    // Test case 2: Add new image with mark_old_as_deleted = true
    console.log('\n2. Adding new image with mark_old_as_deleted = true:');
    const newImage = await addEventImage(eventId, 'https://example.com/new-image.jpg', 'New image', true);
    console.log('✓ New image added:', newImage);

    // Get all current images (should only show non-deleted ones)
    currentImages = await getEventImages(eventId);
    console.log('✓ Active images count after update:', currentImages.length);
    console.log('✓ Active images:', currentImages.map(img => ({ id: img.id, url: img.image_url, is_deleted: img.is_deleted })));

    // Test case 3: Add another image without marking old as deleted
    console.log('\n3. Adding another image without marking old as deleted:');
    const anotherImage = await addEventImage(eventId, 'https://example.com/another-image.jpg', 'Another image', false);
    console.log('✓ Another image added:', anotherImage);

    // Get all current images (should show all non-deleted images)
    currentImages = await getEventImages(eventId);
    console.log('✓ Final active images count:', currentImages.length);
    console.log('✓ Final active images:', currentImages.map(img => ({ id: img.id, url: img.image_url, is_deleted: img.is_deleted })));

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('✗ Stack:', error.stack);
  }
}

// Run the test
testEventImageUpdate();
