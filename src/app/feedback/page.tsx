import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { FeedbackList } from '@/components/feedback/FeedbackList';

export const metadata = {
  title: 'Feedback | Better Contacts',
  description: 'Share your feedback, report bugs, or suggest improvements',
};

export default async function FeedbackPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = user.role === 'SYSTEM_ADMIN';

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <FeedbackList isAdmin={isAdmin} />
      </div>
    </div>
  );
}
