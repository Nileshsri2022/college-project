# Profile Modal Tests

This directory contains tests for the Profile Modal component functionality.

## Files

- `profile-modal.test.tsx` - Unit tests for the ProfileModal component (requires testing framework)
- `profile-modal-integration.test.js` - Integration tests that can be run in the browser console

## How to Run Integration Tests

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application** in your browser and navigate to the dashboard

3. **Open browser developer tools** (F12) and go to the Console tab

4. **Load the test functions** by copying and pasting this script:
   ```javascript
   // Load test functions
   fetch('/components/__tests__/profile-modal-integration.test.js')
     .then(response => response.text())
     .then(script => eval(script))
     .then(() => console.log('Test functions loaded!'))
   ```

5. **Run individual tests:**
   ```javascript
   // Test 1: Check if Profile button exists
   profileModalTests.testProfileButtonExists()

   // Test 2: Check if clicking Profile button opens modal
   profileModalTests.testProfileButtonOpensModal()

   // Test 3: Check if modal contains expected form fields
   profileModalTests.testModalContainsFormFields()

   // Test 4: Check if modal can be closed
   profileModalTests.testModalCanBeClosed()

   // Test 5: Check if form fields are editable
   profileModalTests.testFormFieldsAreEditable()

   // Test 6: Check if Save and Cancel buttons exist
   profileModalTests.testButtonsExist()
   ```

## Test Descriptions

### Test 1: Profile Button Exists
- **Purpose**: Verify that the Profile button is present in the navbar
- **Expected Result**: ✅ PASS: Profile button found in navbar

### Test 2: Profile Button Opens Modal
- **Purpose**: Verify that clicking the Profile button opens the modal
- **Expected Result**: ✅ PASS: Profile modal opened successfully

### Test 3: Modal Contains Form Fields
- **Purpose**: Verify that the modal contains expected form fields (Full Name, Phone, Address)
- **Expected Result**: ✅ PASS: All expected form fields found

### Test 4: Modal Can Be Closed
- **Purpose**: Verify that the modal can be closed using the close button
- **Expected Result**: ✅ PASS: Modal closed successfully

### Test 5: Form Fields Are Editable
- **Purpose**: Verify that form fields can be edited by the user
- **Expected Result**: ✅ PASS: Form fields are editable

### Test 6: Buttons Exist
- **Purpose**: Verify that Save and Cancel buttons are present in the modal
- **Expected Result**: ✅ PASS: Both Save and Cancel buttons found

## Manual Testing Checklist

- [ ] Profile button is visible in the navbar
- [ ] Clicking Profile button opens the modal
- [ ] Modal displays current user information
- [ ] Form fields (Name, Phone, Address) are editable
- [ ] Save button submits changes
- [ ] Cancel button closes modal without saving
- [ ] Modal closes when clicking the X button
- [ ] Error handling works for invalid data
- [ ] Success message appears after saving

## Troubleshooting

If tests fail:

1. **Check if the modal is properly integrated** in the dashboard component
2. **Verify that all UI components** (Dialog, Button, Input, etc.) are properly imported
3. **Check browser console** for any JavaScript errors
4. **Ensure the ProfileModal component** is properly exported and imported
5. **Verify that the modal state** (isOpen, onClose) is properly managed

## API Testing

To test the backend API endpoints:

```javascript
// Test profile update API
fetch('/api/auth/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Test User',
    phone: '+1234567890',
    address: '123 Test St'
  })
})
.then(response => response.json())
.then(data => console.log('Profile update result:', data))

// Test password change API
fetch('/api/auth/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: 'currentpassword',
    newPassword: 'newpassword123'
  })
})
.then(response => response.json())
.then(data => console.log('Password change result:', data))
