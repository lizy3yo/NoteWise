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
        // Use a flag to prevent infinite loops
        try {
            if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                // Check if this event is already being dispatched
                if (!(window as any).__alertEventDispatching) {
                    (window as any).__alertEventDispatching = true;
                    const ev = new CustomEvent('notewise:alert', { detail: { type, message, title } });
                    window.dispatchEvent(ev);
                    // Reset flag after event dispatch completes
                    setTimeout(() => {
                        (window as any).__alertEventDispatching = false;
                    }, 0);
                }
            }
        } catch (e) {
            // ignore if CustomEvent isn't supported
            (window as any).__alertEventDispatching = false;
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