import React, { useEffect } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import { useTaskStore } from '@/store/useTaskStore';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useTaskStore();

    useEffect(() => {
        if (theme.mode === 'dark') {
            document.documentElement.classList.add('dark');
            document.body.style.background = '#141414'; // AntD dark bg
        } else {
            document.documentElement.classList.remove('dark');
            document.body.style.background = '#f5f5f5'; // AntD light bg
        }
    }, [theme.mode]);

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1677ff',
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
};
