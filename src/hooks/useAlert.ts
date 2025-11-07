'use client';

import { useState, useCallback } from 'react';
import { AlertType } from '@/components/ui/alert_template/Alert';

interface AlertState {
    isVisible: boolean;
    type: AlertType;
    message: string;
    title?: string;
}

export const useAlert = () => {
    const [alert, setAlert] = useState<AlertState>({
        isVisible: false,
        type: 'info',
        message: ''
    });

    const showAlert = useCallback((
        type: AlertType,
        message: string,
        title?: string
    ) => {
        setAlert({
            isVisible: true,
            type,
            message,
            title
        });
        // Dispatch a global event so layout (or any global listener) can show the alert
        try {
            if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                const ev = new CustomEvent('notewise:alert', { detail: { type, message, title } });
                window.dispatchEvent(ev);
            }
        } catch (e) {
            // ignore if CustomEvent isn't supported
        }
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(prev => ({
            ...prev,
            isVisible: false
        }));
    }, []);

    const showSuccess = useCallback((message: string, title?: string) => {
        showAlert('success', message, title);
    }, [showAlert]);

    const showError = useCallback((message: string, title?: string) => {
        showAlert('error', message, title);
    }, [showAlert]);

    const showWarning = useCallback((message: string, title?: string) => {
        showAlert('warning', message, title);
    }, [showAlert]);

    const showInfo = useCallback((message: string, title?: string) => {
        showAlert('info', message, title);
    }, [showAlert]);

    return {
        alert,
        showAlert,
        hideAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo
    };
};