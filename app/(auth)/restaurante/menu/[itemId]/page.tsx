import { redirect } from 'next/navigation';

// This route is not used — editing is done inline in the menu page
export default function ItemEditPage() {
  redirect('/restaurante/menu');
}
