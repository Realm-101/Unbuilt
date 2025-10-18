// Run this in your browser console to reset your search count for testing
// Make sure you're logged in first!

async function resetSearchCount() {
  try {
    // Get the access token from localStorage or wherever it's stored
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
      console.error('❌ No access token found. Make sure you\'re logged in!');
      return;
    }
    
    const response = await fetch('/api/dev/reset-searches', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Search count reset successfully!');
      console.log('Refreshing page...');
      window.location.reload();
    } else {
      console.error('❌ Failed to reset:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run it
resetSearchCount();
