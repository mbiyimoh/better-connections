import { ContactsView } from '@/components/contacts/ContactsView';
import { MobileErrorBoundary } from '@/components/layout/MobileErrorBoundary';

export default function ContactsPage() {
  return (
    <MobileErrorBoundary>
      <ContactsView />
    </MobileErrorBoundary>
  );
}
