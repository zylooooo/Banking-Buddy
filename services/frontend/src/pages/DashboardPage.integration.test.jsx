import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import * as authService from '../services/authService';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );
};

describe('DashboardPage Integration Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.clearAllMocks();
    
    // Ensure auth service returns expected values for each test
    vi.spyOn(authService, 'isAuthenticated').mockResolvedValue(true);
    vi.spyOn(authService, 'getUserFromToken').mockResolvedValue({
      sub: 'user-1',
      email: 'agent@test.com',
      firstName: 'Test',
      lastName: 'Agent',
      role: 'AGENT',
    });
  });

  it('loads and displays user data from API', async () => {
    renderDashboard();

    // Wait for loading to complete and unique content to appear
    await waitFor(() => {
      expect(screen.getByText(/Manage client profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if user email appears in the user info card
    await waitFor(() => {
      expect(screen.getByText('agent@test.com')).toBeInTheDocument();
    });
  });

  it('displays welcome message', async () => {
    renderDashboard();

    // Wait for page to load using unique text
    await waitFor(() => {
      expect(screen.getByText(/Manage client profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Then check if welcome message exists (using getAllByText since it appears twice)
    expect(screen.getAllByText('Welcome to Banking Buddy CRM System').length).toBeGreaterThan(0);
  });

  it('displays quick action cards', async () => {
    renderDashboard();

    // Wait for client management description which is unique
    await waitFor(() => {
      expect(screen.getByText(/Manage client profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Now check for client management card
    expect(screen.getAllByText('Client Management').length).toBeGreaterThan(0);
  });

  it('has working navigation link to client management', async () => {
    renderDashboard();

    // Wait for the card description which is unique
    await waitFor(() => {
      expect(screen.getByText(/Manage client profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Use getAllByText since "Client Management" appears in both navigation and card
    const clientLinks = screen.getAllByText('Client Management');
    expect(clientLinks.length).toBeGreaterThan(0);
    
    // Find the one that's a link in the card section (it's in an H3)
    const clientCard = clientLinks.find(el => el.tagName === 'H3');
    expect(clientCard?.closest('a')).toHaveAttribute('href', '/clients');
  });

  it('redirects to login when not authenticated', async () => {
    // Mock as not authenticated
    vi.spyOn(authService, 'isAuthenticated').mockResolvedValue(false);

    renderDashboard();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays loading state initially', () => {
    renderDashboard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles user data loading error gracefully', async () => {
    // Mock API to return 404 for our default user-1
    const { server } = await import('../tests/mocks/server');
    const { http, HttpResponse } = await import('msw');
    
    server.use(
      http.get('http://localhost:8080/api/users/user-1', () => {
        return HttpResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      })
    );

    renderDashboard();

    // Should show the error UI with "Error" heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /error/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // And a retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows navigation component with user info', async () => {
    renderDashboard();

    // Wait for unique card description
    await waitFor(() => {
      expect(screen.getByText(/Manage client profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Navigation should be visible with Banking Buddy title
    expect(screen.getByText('Banking Buddy')).toBeInTheDocument();
    
    // And the user info should be visible (appears 3 times - in nav, header, user card)
    expect(screen.getAllByText('Test Agent').length).toBeGreaterThan(0);
  });
});
