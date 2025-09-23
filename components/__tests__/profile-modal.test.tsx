import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileModal } from '../profile-modal'
import { useToast } from '@/hooks/use-toast'
// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('ProfileModal', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    email_confirmed_at: '2023-01-01T00:00:00Z',
    last_sign_in_at: '2023-01-01T00:00:00Z'
  }

  const mockUserProfile = {
    id: '123',
    email: 'test@example.com',
    full_name: 'John Doe',
    phone: '+1234567890',
    address: '123 Main St',
    created_at: '2023-01-01T00:00:00Z'
  }

  const mockOnProfileUpdate = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders profile modal when isOpen is true', () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    expect(screen.getByText('Profile Management')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(
      <ProfileModal
        isOpen={false}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    expect(screen.queryByText('Profile Management')).not.toBeInTheDocument()
  })

  it('displays user profile information correctly', () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
  })

  it('allows editing profile fields', async () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    const nameInput = screen.getByDisplayValue('John Doe')
    const phoneInput = screen.getByDisplayValue('+1234567890')
    const addressInput = screen.getByDisplayValue('123 Main St')

    // Test that inputs are editable
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })
    fireEvent.change(phoneInput, { target: { value: '+0987654321' } })
    fireEvent.change(addressInput, { target: { value: '456 Oak St' } })

    expect(nameInput).toHaveValue('Jane Smith')
    expect(phoneInput).toHaveValue('+0987654321')
    expect(addressInput).toHaveValue('456 Oak St')
  })

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('submits profile update successfully', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          ...mockUserProfile,
          full_name: 'Jane Smith',
          phone: '+0987654321'
        }
      })
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    // Modify form fields
    const nameInput = screen.getByDisplayValue('John Doe')
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })

    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)

    // Wait for API call and assertions
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Jane Smith',
          phone: '+1234567890',
          address: '123 Main St',
          bio: '',
          website: '',
          company: '',
          job_title: '',
          photo_url: ''
        })
      })
    })

    expect(mockOnProfileUpdate).toHaveBeenCalledWith({
      ...mockUserProfile,
      full_name: 'Jane Smith',
      phone: '+0987654321'
    })
  })

  it('handles API errors gracefully', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Failed to update profile'
      })
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Error should be handled (toast should be called)
    expect(mockOnProfileUpdate).not.toHaveBeenCalled()
  })

  it('shows loading state during save', async () => {
    // Mock slow API response
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockUserProfile })
      }), 100))
    )

    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)

    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()

    // After API completes, should show normal state
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
      expect(saveButton).not.toBeDisabled()
    })
  })

  it('closes modal after successful save', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockUserProfile })
    })

    render(
      <ProfileModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        userProfile={mockUserProfile}
        onProfileUpdate={mockOnProfileUpdate}
      />
    )

    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })
})
