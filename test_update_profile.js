// Test script to verify update profile functionality
const { updateProfile, getUserProfile } = require('./src/repository/userRepository');

async function testUpdateProfile() {
  console.log('Testing update profile with image URL and other fields...');
  
  try {
    // Test case 1: Update all profile fields
    console.log('\n1. Testing update with all fields:');
    const userId = 'test-user-id'; // Replace with actual user ID
    
    const result1 = await updateProfile(userId, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      img_url: 'https://example.com/profile-image.jpg',
      contact: '+1234567890',
      address: '123 Test Street, Test City',
      date_of_birth: '1990-01-01',
      gender: 'MALE'
    });
    
    console.log('✓ Success:', result1);

    // Test case 2: Update only image URL
    console.log('\n2. Testing update with only image_url:');
    const result2 = await updateProfile(userId, {
      img_url: 'https://example.com/new-profile-image.jpg'
    });
    console.log('✓ Success:', result2);

    // Test case 3: Get updated profile to verify
    console.log('\n3. Testing get updated profile:');
    const profile = await getUserProfile(userId);
    console.log('✓ Profile retrieved:', profile);

  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

// Run the test
testUpdateProfile();
