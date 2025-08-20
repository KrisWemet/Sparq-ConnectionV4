import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { RegistrationFlow } from '../RegistrationFlow/RegistrationFlow'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Heart: () => <div data-testid="heart-icon" />,
  User: () => <div data-testid="user-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
}))

describe('RegistrationFlow', () => {
  const mockOnComplete = jest.fn()
  const defaultProps = {
    onComplete: mockOnComplete,
    jurisdiction: 'US' as const,
    disabled: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render welcome step initially', () => {
    render(<RegistrationFlow {...defaultProps} />)
    
    expect(screen.getByText('Welcome to Sparq Connection')).toBeInTheDocument()
    expect(screen.getByText(/safety-first relationship wellness platform/)).toBeInTheDocument()
  })

  it('should show progress indicator', () => {
    render(<RegistrationFlow {...defaultProps} />)
    
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should navigate through steps', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Start at welcome step
    expect(screen.getByText('Welcome to Sparq Connection')).toBeInTheDocument()
    
    // Navigate to safety explanation
    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 6')).toBeInTheDocument()
      expect(screen.getByText(/Safety Monitoring Explanation/)).toBeInTheDocument()
    })
  })

  it('should handle back navigation', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate forward
    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)
    
    // Navigate back
    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)
    
    await waitFor(() => {
      expect(screen.getByText('Step 1 of 6')).toBeInTheDocument()
      expect(screen.getByText('Welcome to Sparq Connection')).toBeInTheDocument()
    })
  })

  it('should collect user data through profile setup', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate to profile setup (steps 1-3)
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
    }
    
    // Should be at profile setup
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    
    // Fill out form
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate to profile setup
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
    }
    
    // Try to continue without filling required fields
    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument()
    })
  })

  it('should validate password requirements', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate to profile setup
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
    }
    
    // Enter weak password
    await user.type(screen.getByLabelText(/^password/i), 'weak')
    
    // Should show password requirements
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/one number/i)).toBeInTheDocument()
  })

  it('should validate password confirmation', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate to profile setup
    for (let i = 0; i < 3; i++) {
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
    }
    
    // Enter mismatched passwords
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!')
    
    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('should handle archetype selection', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate to archetype selection (step 5)
    for (let i = 0; i < 4; i++) {
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
    }
    
    // Fill profile step first
    if (screen.queryByLabelText(/full name/i)) {
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email/i), 'john@example.com')
      await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
      
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
    }
    
    // Should be at archetype selection
    expect(screen.getByText(/communication style/i)).toBeInTheDocument()
    expect(screen.getByText(/love language/i)).toBeInTheDocument()
    
    // Select communication style and love language
    const directButton = screen.getByRole('button', { name: /direct/i })
    await user.click(directButton)
    
    const qualityTimeButton = screen.getByRole('button', { name: /quality time/i })
    await user.click(qualityTimeButton)
  })

  it('should collect consent data', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Navigate through all steps to consent
    for (let i = 0; i < 5; i++) {
      const nextButton = screen.getByRole('button', { name: /continue/i })
      await user.click(nextButton)
      await waitFor(() => {})
      
      // Handle profile setup step
      if (screen.queryByLabelText(/full name/i)) {
        await user.type(screen.getByLabelText(/full name/i), 'John Doe')
        await user.type(screen.getByLabelText(/email/i), 'john@example.com')
        await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
        await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
        
        const continueButton = screen.getByRole('button', { name: /continue/i })
        await user.click(continueButton)
        await waitFor(() => {})
      }
      
      // Handle archetype selection
      if (screen.queryByText(/communication style/i)) {
        const directButton = screen.getByRole('button', { name: /direct/i })
        await user.click(directButton)
        
        const qualityTimeButton = screen.getByRole('button', { name: /quality time/i })
        await user.click(qualityTimeButton)
        
        const continueButton = screen.getByRole('button', { name: /continue/i })
        await user.click(continueButton)
        await waitFor(() => {})
      }
    }
    
    // Should be at consent step
    expect(screen.getByText(/privacy & consent/i)).toBeInTheDocument()
  })

  it('should complete registration and call onComplete', async () => {
    const user = userEvent.setup()
    render(<RegistrationFlow {...defaultProps} />)
    
    // Mock complete registration flow
    const completeRegistration = async () => {
      // Navigate through all steps
      for (let i = 0; i < 6; i++) {
        const nextButton = screen.getByRole('button', { name: /continue/i })
        if (nextButton) await user.click(nextButton)
        await waitFor(() => {})
        
        // Handle specific steps
        if (screen.queryByLabelText(/full name/i)) {
          await user.type(screen.getByLabelText(/full name/i), 'John Doe')
          await user.type(screen.getByLabelText(/email/i), 'john@example.com')
          await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
          await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
        }
        
        if (screen.queryByText(/communication style/i)) {
          const directButton = screen.getByRole('button', { name: /direct/i })
          await user.click(directButton)
          
          const qualityTimeButton = screen.getByRole('button', { name: /quality time/i })
          await user.click(qualityTimeButton)
        }
      }
      
      // Final registration button
      const finalButton = screen.getByRole('button', { name: /create account/i })
      if (finalButton) await user.click(finalButton)
    }
    
    await completeRegistration()
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123!'
        })
      )
    })
  })

  it('should be disabled when disabled prop is true', () => {
    render(<RegistrationFlow {...defaultProps} disabled={true} />)
    
    const nextButton = screen.getByRole('button', { name: /continue/i })
    expect(nextButton).toBeDisabled()
  })

  it('should show jurisdiction-specific content', () => {
    render(<RegistrationFlow {...defaultProps} jurisdiction="DE" />)
    
    // Should show GDPR-specific content for German jurisdiction
    expect(screen.getByText(/GDPR/i)).toBeInTheDocument()
  })

  it('should handle step navigation errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<RegistrationFlow {...defaultProps} />)
    
    // Try to navigate with invalid data
    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)
    
    // Should handle gracefully without crashing
    expect(screen.getByText(/Safety Monitoring Explanation/i)).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })
})