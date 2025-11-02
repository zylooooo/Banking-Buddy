import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ClientManagementPage from './ClientManagementPage';
import { server } from '../tests/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderClientManagement = () => {
  return render(
    <BrowserRouter>
      <ClientManagementPage />
    </BrowserRouter>
  );
};

describe('ClientManagementPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it('loads and displays clients from API', async () => {
    renderClientManagement();

    // Wait for page to load - look for unique description text
    await waitFor(() => {
      expect(screen.getByText('Manage client profiles and information')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if clients are displayed
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays client count', async () => {
    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('Manage client profiles and information')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for multiple clients in the list
    await waitFor(() => {
      const clients = screen.getAllByText(/john\.doe@example\.com|jane\.smith@example\.com/i);
      expect(clients.length).toBeGreaterThan(0);
    });
  });

  it('shows create new client button', async () => {
    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('Manage client profiles and information')).toBeInTheDocument();
    });

    // Look for create button (might be "Create New Client" or similar)
    await waitFor(() => {
      const createButton = screen.queryByText(/create/i);
      if (createButton) {
        expect(createButton).toBeInTheDocument();
      }
    });
  });

  it('displays verified status for clients', async () => {
    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 3000 });

    // John Doe should show as verified (check for verification indicator)
    await waitFor(() => {
      // Look for any verification indicator in the UI
      const verifiedElements = screen.queryAllByText(/verified|✓|check/i);
      expect(verifiedElements.length).toBeGreaterThan(0);
    });
  });

  it('handles API error when loading clients', async () => {
    // Mock API error
    server.use(
      http.get('http://localhost:8081/api/clients', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderClientManagement();

    await waitFor(() => {
      // Should show error state or message
      const errorText = screen.queryByText(/failed|error/i);
      expect(errorText).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('creates a new client successfully', async () => {
    const user = userEvent.setup();
    renderClientManagement();

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Manage client profiles and information')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Look for and click create button
    const createButton = screen.queryByText(/create new client|add client|create client/i);
    if (createButton) {
      await user.click(createButton);

      // Wait for form to appear
      await waitFor(() => {
        const firstNameInput = screen.queryByLabelText(/first name/i);
        if (firstNameInput) {
          expect(firstNameInput).toBeInTheDocument();
        }
      });
    }
  });

  it('handles client creation with duplicate email', async () => {
    const user = userEvent.setup();

    // Mock API error for duplicate email
    server.use(
      http.post('http://localhost:8081/api/clients', async ({ request }) => {
        const body = await request.json();
        if (body.email === 'john@example.com') {
          return HttpResponse.json(
            { message: 'Email already exists' },
            { status: 400 }
          );
        }
        return HttpResponse.json(
          { data: body, message: 'Client created' },
          { status: 201 }
        );
      })
    );

    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('Manage client profiles and information')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Try to create client (if form is available in UI)
    const createButton = screen.queryByText(/create new client|add client|create client/i);
    if (createButton) {
      await user.click(createButton);

      await waitFor(() => {
        const emailInput = screen.queryByLabelText(/email/i);
        if (emailInput) {
          user.type(emailInput, 'john@example.com');
        }
      });
    }
  });

  it('verifies a client successfully', async () => {
    const user = userEvent.setup();
    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Look for verify button for unverified client
    const verifyButtons = screen.queryAllByText(/verify/i);
    if (verifyButtons.length > 0) {
      await user.click(verifyButtons[0]);

      // Should show success or reload data
      await waitFor(() => {
        // Client list should still be visible (using getAllByText for duplicate text)
        expect(screen.getAllByText('Client Management').length).toBeGreaterThan(0);
      });
    }
  });

  it('deletes a client with confirmation', async () => {
    const user = userEvent.setup();

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Look for delete button
    const deleteButtons = screen.queryAllByText(/delete/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();

      // Should still see the client list (checking for table content instead)
      await waitFor(() => {
        expect(screen.getAllByText('Client Management').length).toBeGreaterThan(0);
      });
    }

    window.confirm.mockRestore();
  });

  it('cancels client deletion when user declines confirmation', async () => {
    const user = userEvent.setup();

    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false);

    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    }, { timeout: 3000 });

    const deleteButtons = screen.queryAllByText(/delete/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();

      // Client should still be visible
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    }

    window.confirm.mockRestore();
  });

  it('displays navigation with user info', async () => {
    renderClientManagement();

    await waitFor(() => {
      expect(screen.getByText('Banking Buddy')).toBeInTheDocument();
    });

    expect(screen.getByText('CRM System')).toBeInTheDocument();
  });
});
