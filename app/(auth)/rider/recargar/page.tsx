'use client';

import { useRouter } from 'next/navigation';
import { useRider } from '@/components/rider-panel/rider-context';
import { RechargeScreen } from '@/components/rider-panel/recharge-screen';

export default function RiderRechargePage() {
  const router = useRouter();
  const { rider, isLoading } = useRider();

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // #117: fixed_salary → redirect
  if (rider && rider.pay_type === 'fixed_salary') {
    router.replace('/rider');
    return null;
  }

  return <RechargeScreen />;
}
