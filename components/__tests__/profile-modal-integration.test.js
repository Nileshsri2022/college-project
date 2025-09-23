/**
 * Profile Modal Integration Test
 *
 * This is a simple integration test to verify that the Profile Modal
 * component works correctly with the dashboard. This test can be run
 * manually by following the steps below.
 *
 * To run this test:
 * 1. Start the development server: npm run dev
 * 2. Open the application in a browser
 * 3. Open browser developer tools (F12)
 * 4. Go to the Console tab
 * 5. Copy and paste the test functions below
 * 6. Run each test function and verify the results
 */

// Test 1: Check if Profile button exists in the navbar
function testProfileButtonExists() {
  console.log('🧪 Test 1: Checking if Profile button exists in navbar...');

  const profileButton = document.querySelector('button:has(svg.lucide-user)');
  if (profileButton && profileButton.textContent.includes('Profile')) {
    console.log('✅ PASS: Profile button found in navbar');
    return true;
  } else {
    console.log('❌ FAIL: Profile button not found in navbar');
    return false;
  }
}

// Test 2: Check if clicking Profile button opens modal
function testProfileButtonOpensModal() {
  console.log('🧪 Test 2: Checking if Profile button opens modal...');

  const profileButton = document.querySelector('button:has(svg.lucide-user)');
  if (!profileButton) {
    console.log('❌ FAIL: Profile button not found');
    return false;
  }

  // Click the profile button
  profileButton.click();

  // Wait a moment for modal to appear
  setTimeout(() => {
    const modal = document.querySelector('[data-radix-dialog-overlay]');
    if (modal) {
      console.log('✅ PASS: Profile modal opened successfully');
      return true;
    } else {
      console.log('❌ FAIL: Profile modal did not open');
      return false;
    }
  }, 100);
}

// Test 3: Check if modal contains expected form fields
function testModalContainsFormFields() {
  console.log('🧪 Test 3: Checking if modal contains expected form fields...');

  const modal = document.querySelector('[data-radix-dialog-overlay]');
  if (!modal) {
    console.log('❌ FAIL: Profile modal not found');
    return false;
  }

  const expectedFields = ['Full Name', 'Phone', 'Address'];
  let foundFields = 0;

  expectedFields.forEach(fieldName => {
    const label = Array.from(modal.querySelectorAll('label')).find(
      label => label.textContent.includes(fieldName)
    );
    if (label) {
      foundFields++;
      console.log(`✅ Found field: ${fieldName}`);
    } else {
      console.log(`❌ Missing field: ${fieldName}`);
    }
  });

  if (foundFields === expectedFields.length) {
    console.log('✅ PASS: All expected form fields found');
    return true;
  } else {
    console.log(`❌ FAIL: Only found ${foundFields}/${expectedFields.length} expected fields`);
    return false;
  }
}

// Test 4: Check if modal can be closed
function testModalCanBeClosed() {
  console.log('🧪 Test 4: Checking if modal can be closed...');

  const modal = document.querySelector('[data-radix-dialog-overlay]');
  if (!modal) {
    console.log('❌ FAIL: Profile modal not found');
    return false;
  }

  // Try to close modal by clicking the close button
  const closeButton = modal.querySelector('button[aria-label="Close"]') ||
                     modal.querySelector('button:has(svg.lucide-x)');

  if (closeButton) {
    closeButton.click();

    setTimeout(() => {
      const modalAfterClose = document.querySelector('[data-radix-dialog-overlay]');
      if (!modalAfterClose) {
        console.log('✅ PASS: Modal closed successfully');
        return true;
      } else {
        console.log('❌ FAIL: Modal did not close');
        return false;
      }
    }, 100);
  } else {
    console.log('❌ FAIL: Close button not found');
    return false;
  }
}

// Test 5: Check if form fields are editable
function testFormFieldsAreEditable() {
  console.log('🧪 Test 5: Checking if form fields are editable...');

  const modal = document.querySelector('[data-radix-dialog-overlay]');
  if (!modal) {
    console.log('❌ FAIL: Profile modal not found');
    return false;
  }

  const nameInput = modal.querySelector('input[placeholder*="full name"]') ||
                   modal.querySelector('input[value*="John"]') ||
                   modal.querySelector('input[value*="test"]');

  if (nameInput) {
    // Try to edit the field
    const originalValue = nameInput.value;
    const testValue = 'Test User';

    // Simulate user input
    nameInput.focus();
    nameInput.value = testValue;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (nameInput.value === testValue) {
      console.log('✅ PASS: Form fields are editable');
      return true;
    } else {
      console.log('❌ FAIL: Form fields are not editable');
      return false;
    }
  } else {
    console.log('❌ FAIL: Name input field not found');
    return false;
  }
}

// Test 6: Check if Save and Cancel buttons exist
function testButtonsExist() {
  console.log('🧪 Test 6: Checking if Save and Cancel buttons exist...');

  const modal = document.querySelector('[data-radix-dialog-overlay]');
  if (!modal) {
    console.log('❌ FAIL: Profile modal not found');
    return false;
  }

  const saveButton = Array.from(modal.querySelectorAll('button')).find(
    button => button.textContent.includes('Save')
  );

  const cancelButton = Array.from(modal.querySelectorAll('button')).find(
    button => button.textContent.includes('Cancel')
  );

  if (saveButton && cancelButton) {
    console.log('✅ PASS: Both Save and Cancel buttons found');
    return true;
  } else {
    console.log('❌ FAIL: Save or Cancel button missing');
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Profile Modal Integration Tests...\n');

  // Note: These tests need to be run manually in sequence
  // as they depend on DOM state changes

  console.log('📋 Test Instructions:');
  console.log('1. Run testProfileButtonExists()');
  console.log('2. Run testProfileButtonOpensModal()');
  console.log('3. Run testModalContainsFormFields()');
  console.log('4. Run testModalCanBeClosed()');
  console.log('5. Run testFormFieldsAreEditable()');
  console.log('6. Run testButtonsExist()');

  console.log('\n💡 Tip: Run each test function individually in the console');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.profileModalTests = {
    testProfileButtonExists,
    testProfileButtonOpensModal,
    testModalContainsFormFields,
    testModalCanBeClosed,
    testFormFieldsAreEditable,
    testButtonsExist,
    runAllTests
  };

  console.log('✅ Profile Modal test functions loaded!');
  console.log('Run: profileModalTests.runAllTests() to see available tests');
}
