import React from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const loadPreference = async (): Promise<void> => {
      if (typeof AccessibilityInfo?.isReduceMotionEnabled !== 'function') {
        return;
      }
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (active) {
          setReduced(Boolean(enabled));
        }
      } catch {
        if (active) {
          setReduced(false);
        }
      }
    };

    void loadPreference();

    const subscription =
      typeof AccessibilityInfo?.addEventListener === 'function'
        ? AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => setReduced(Boolean(enabled)))
        : null;

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
