/**
 * @description
 * The default home page component for the application (route '/').
 * This component immediately redirects the user to the main dashboard at '/dashboard'.
 *
 * @dependencies
 * - next/navigation: Provides the `redirect` function for server-side redirects.
 *
 * @notes
 * - This is a Server Component. Redirecting here prevents rendering unnecessary
 * content on the root page.
 */
import { redirect } from 'next/navigation';

/**
 * Immediately redirects the user to the /dashboard route.
 * @returns {never} This component never renders anything as it always redirects.
 */
export default function RootPage(): never {
  // Perform a permanent server-side redirect to the dashboard
  redirect('/dashboard');
}