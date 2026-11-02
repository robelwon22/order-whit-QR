import { StaffProvider } from '../../lib/useStaff';

/**
 * Provides staff authentication to the super-admin route.
 */
export default function SuperAdminLayout({ children }) {
  return <StaffProvider>{children}</StaffProvider>;
}
