import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard where the user can see chatrooms. Auth middleware checks if user is logged in.
  redirect('/dashboard');
}
