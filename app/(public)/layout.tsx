import { DesktopBanner } from '@/components/shared/desktop-banner';
import { CartDrawerWrapper } from '@/components/cart/cart-drawer-wrapper';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DesktopBanner />
      <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-client lg:max-w-restaurant">
        {children}
      </main>
      <CartDrawerWrapper />
    </>
  );
}
