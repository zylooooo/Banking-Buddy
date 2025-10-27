import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../tests/utils';
import Navigation from './Navigation';

describe('Navigation', () => {
  const mockUser = {
    firstName: 'John',
    lastName: 'Doe',
    role: 'AGENT',
  };

  it('renders navigation with user info', () => {
    renderWithRouter(<Navigation user={mockUser} />);
    
    expect(screen.getByText('Banking Buddy')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('AGENT')).toBeInTheDocument();
  });

  it('shows agent-specific menu items', () => {
    renderWithRouter(<Navigation user={mockUser} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Client Management')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
  });

  it('does not show admin menu items for agent', () => {
    renderWithRouter(<Navigation user={mockUser} />);
    
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
  });

  it('shows admin menu items for admin user', () => {
    const adminUser = { ...mockUser, role: 'ADMIN' };
    renderWithRouter(<Navigation user={adminUser} />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Account Overview')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('displays user initials in avatar', () => {
    renderWithRouter(<Navigation user={mockUser} />);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows all navigation items for ROOT_ADMIN', () => {
    const rootAdminUser = { ...mockUser, role: 'ROOT_ADMIN' };
    renderWithRouter(<Navigation user={rootAdminUser} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Client Management')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Account Overview')).toBeInTheDocument();
  });

  it('displays CRM System subtitle', () => {
    renderWithRouter(<Navigation user={mockUser} />);
    
    expect(screen.getByText('CRM System')).toBeInTheDocument();
  });
});
