'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  CHECKOUT_STEPS,
  CHECKOUT_STEP_LABELS,
  type CheckoutStep,
} from '@/types/checkout';

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  completedSteps: Set<CheckoutStep>;
}

export function CheckoutStepper({
  currentStep,
  completedSteps,
}: CheckoutStepperProps) {
  const currentIndex = CHECKOUT_STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {CHECKOUT_STEPS.map((step, index) => {
        const isCompleted = completedSteps.has(step);
        const isCurrent = step === currentStep;
        const isPast = index < currentIndex;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-colors duration-300
                  ${
                    isCompleted || isPast
                      ? 'bg-[#FF6B35] text-white'
                      : isCurrent
                        ? 'bg-[#FF6B35] text-white ring-4 ring-[#FF6B35]/20'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0, repeatDelay: 2 }}
              >
                {isCompleted || isPast ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </motion.div>
              <span
                className={`
                  text-[10px] mt-1 font-medium whitespace-nowrap
                  ${isCurrent ? 'text-[#FF6B35]' : 'text-gray-400 dark:text-gray-500'}
                `}
              >
                {CHECKOUT_STEP_LABELS[step]}
              </span>
            </div>

            {index < CHECKOUT_STEPS.length - 1 && (
              <div className="flex-1 mx-2 mt-[-16px]">
                <div className="h-[2px] bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#FF6B35] rounded-full"
                    initial={{ width: '0%' }}
                    animate={{
                      width: isPast || isCompleted ? '100%' : isCurrent ? '50%' : '0%',
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
