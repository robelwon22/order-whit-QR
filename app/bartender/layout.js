import { StaffProvider } from '../../lib/useStaff';

/**
 * Provides staff authentication to the bartender route.
 */
export default function BartenderLayout({ children }) {
  return <StaffProvider>{children}</StaffProvider>;
}
