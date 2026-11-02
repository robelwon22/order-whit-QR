import { StaffProvider } from '../../lib/useStaff';

/**
 * Shares one staff and cafe session across the admin route tree.
 */
export default function AdminLayout({ children }) {
  return <StaffProvider>{children}</StaffProvider>;
}
