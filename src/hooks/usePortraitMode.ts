import { useEffect, useState } from 'react';

/**
 * 响应当前屏幕方向，移动端/平板需要定制化逻辑时使用。
 */
export const usePortraitMode = () => {
    const getIsPortrait = () => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia('(orientation: portrait)').matches;
    };

    const [isPortrait, setIsPortrait] = useState(getIsPortrait);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(orientation: portrait)');
        const handler = (event: MediaQueryListEvent) => setIsPortrait(event.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
        } else {
            mediaQuery.addListener(handler);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handler);
            } else {
                mediaQuery.removeListener(handler);
            }
        };
    }, []);

    return isPortrait;
};
