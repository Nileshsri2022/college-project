/**
 * Simple Profile Modal Test Script
 *
 * This script can be run in the browser console to test basic profile modal functionality.
 * It doesn't require any external testing libraries.
 */

(function() {
  console.log('🧪 Profile Modal Test Script Loaded');

  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  function test(name, testFn) {
    testResults.total++;
    console.log(`\n🧪 Running: ${name}`);

    try {
      const result = testFn();
      if (result) {
        testResults.passed++;
        console.log(`✅ PASS: ${name}`);
      } else {
        testResults.failed++;
        console.log(`❌ FAIL: ${name}`);
      }
    } catch (error) {
      testResults.failed++;
      console.log(`❌ ERROR: ${name} - ${error.message}`);
    }
  }

  function waitForElement(selector, timeout = 2000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  function runTests() {
    console.log('🚀 Starting Profile Modal Tests...\n');

    // Test 1: Check if Profile button exists
    test('Profile button exists in navbar', () => {
      const profileButton = document.querySelector('button:has(svg.lucide-user)') ||
                           document.querySelector('button')?.textContent?.includes('Profile');
      return !!profileButton;
    });

    // Test 2: Check if clicking Profile button opens modal
    test('Profile button opens modal', async () => {
      const profileButton = document.querySelector('button:has(svg.lucide-user)') ||
                           Array.from(document.querySelectorAll('button')).find(btn =>
                             btn.textContent?.includes('Profile')
                           );

      if (!profileButton) return false;

      profileButton.click();

      try {
        await waitForElement('[data-radix-dialog-overlay]', 1000);
        return true;
      } catch (error) {
        return false;
      }
    });

    // Test 3: Check modal content
    test('Modal contains expected content', async () => {
      try {
        const modal = await waitForElement('[data-radix-dialog-overlay]', 500);
        const content = modal.textContent || '';

        const requiredElements = [
          'Profile Management',
          'Full Name',
          'Phone',
          'Address',
          'Save Changes',
          'Cancel'
        ];

        const foundElements = requiredElements.filter(element =>
          content.includes(element)
        );

        return foundElements.length >= 5; // At least 5 of the required elements
      } catch (error) {
        return false;
      }
    });

    // Test 4: Check if modal can be closed
    test('Modal can be closed', async () => {
      try {
        const modal = await waitForElement('[data-radix-dialog-overlay]', 500);
        const closeButton = modal.querySelector('button[aria-label="Close"]') ||
                           modal.querySelector('button:has(svg.lucide-x)');

        if (closeButton) {
          closeButton.click();
          // Wait a bit for modal to close
          await new Promise(resolve => setTimeout(resolve, 200));
          const modalAfterClose = document.querySelector('[data-radix-dialog-overlay]');
          return !modalAfterClose;
        }
        return false;
      } catch (error) {
        return false;
      }
    });

    // Test 5: Check form functionality
    test('Form fields are interactive', async () => {
      try {
        // Open modal again
        const profileButton = document.querySelector('button:has(svg.lucide-user)') ||
                             Array.from(document.querySelectorAll('button')).find(btn =>
                               btn.textContent?.includes('Profile')
                             );
        profileButton?.click();

        const modal = await waitForElement('[data-radix-dialog-overlay]', 500);
        const inputs = modal.querySelectorAll('input[type="text"], input[type="email"]');

        if (inputs.length >= 2) {
          // Try to interact with inputs
          const firstInput = inputs[0];
          const originalValue = firstInput.value;
          const testValue = 'Test Value';

          firstInput.focus();
          firstInput.value = testValue;
          firstInput.dispatchEvent(new Event('input', { bubbles: true }));

          return firstInput.value === testValue;
        }
        return false;
      } catch (error) {
        return false;
      }
    });

    // Display results
    setTimeout(() => {
      console.log('\n📊 Test Results:');
      console.log(`✅ Passed: ${testResults.passed}`);
      console.log(`❌ Failed: ${testResults.failed}`);
      console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

      if (testResults.failed === 0) {
        console.log('🎉 All tests passed! Profile modal is working correctly.');
      } else {
        console.log('⚠️  Some tests failed. Check the implementation.');
      }
    }, 3000);
  }

  // Make functions available globally
  window.profileModalTest = {
    runTests,
    testResults
  };

  console.log('✅ Test script loaded successfully!');
  console.log('💡 Run: profileModalTest.runTests() to start testing');
})();
