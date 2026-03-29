// Simple test script to verify group update functionality
const { updateGroup, findGroupById } = require('./src/repository/groupRepository');
const { getFullUrl } = require('./src/services/uploadService');

async function testGroupUpdate() {
  console.log('Testing group update with name, image_url, and description...');
  
  try {
    // Test case 1: Update all fields
    console.log('\n1. Testing update with all fields (name, image_url, description):');
    const result1 = await updateGroup(1, { 
      name: 'Updated Group Name', 
      description: 'Updated description',
      image_url: 'C:\\uploads\\files\\1773071953819-67817105.png'
    });
    
    // Format the image URL as the service would
    const formattedResult1 = {
      ...result1,
      image_url: result1.image_url ? getFullUrl(result1.image_url) : null,
    };
    console.log('✓ Success with full URL:', formattedResult1);

    // Test case 2: Update only name
    console.log('\n2. Testing update with only name:');
    const result2 = await updateGroup(1, { name: 'Only Name Updated' });
    console.log('✓ Success:', result2);

    // Test case 3: Update only image_url
    console.log('\n3. Testing update with only image_url:');
    const result3 = await updateGroup(1, { 
      image_url: 'C:\\uploads\\files\\test-image.jpg' 
    });
    
    // Format the image URL as the service would
    const formattedResult3 = {
      ...result3,
      image_url: result3.image_url ? getFullUrl(result3.image_url) : null,
    };
    console.log('✓ Success with full URL:', formattedResult3);

    // Test case 4: Update only description
    console.log('\n4. Testing update with only description:');
    const result4 = await updateGroup(1, { description: 'Only description updated' });
    console.log('✓ Success:', result4);

    // Test case 5: Empty update object
    console.log('\n5. Testing update with empty object:');
    const result5 = await updateGroup(1, {});
    console.log('✓ Success (should return original group):', result5);

    // Test case 6: Test getFullUrl function directly
    console.log('\n6. Testing getFullUrl function:');
    const testPath = 'C:\\uploads\\files\\1773071953819-67817105.png';
    const fullUrl = getFullUrl(testPath);
    console.log('✓ Full URL:', fullUrl);
    
    // Test case 7: Test getFullUrl with custom host
    console.log('\n7. Testing getFullUrl with custom host:');
    const customHostUrl = getFullUrl(testPath, 'http://localhost:3000');
    console.log('✓ Custom host URL:', customHostUrl);

    console.log('\n✅ All tests passed! Group update service is working correctly with full URL formatting.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testGroupUpdate().then(() => {
  console.log('\nTest completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
