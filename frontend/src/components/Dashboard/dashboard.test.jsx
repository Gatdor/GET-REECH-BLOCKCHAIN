// frontend/src/components/Dashboard/Dashboard.test.jsx
import { render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

test('renders dashboard title', () => {
  render(<AdminDashboard />);
  expect(screen.getByText(/cooperative.title/i)).toBeInTheDocument();
});