"use client";

import { useState } from 'react';

interface ConnectionInfo {
    state: string;
    database: string;
    host: string;
    port: number;
    collections: string[];
}

interface TestResult {
    success: boolean;
    message: string;
    connectionInfo?: ConnectionInfo;
    error?: string;
    timestamp: string;
}

export default function DatabaseTest() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);

    const testConnection = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/test-db');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({
                success: false,
                message: 'Failed to test connection',
                error: error instanceof Error ? error.message : 'Network error',
                timestamp: new Date().toISOString()
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">MongoDB Connection Test</h2>

            <button
                onClick={testConnection}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Testing Connection...
                    </div>
                ) : (
                    'Test MongoDB Connection'
                )}
            </button>

            {result && (
                <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {result.success ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                            {result.success ? 'Connection Successful!' : 'Connection Failed'}
                        </h3>
                    </div>

                    <p className={`mb-3 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                    </p>

                    {result.connectionInfo && (
                        <div className="bg-white p-3 rounded border">
                            <h4 className="font-medium text-gray-900 mb-2">Connection Details:</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                                <p><span className="font-medium">State:</span> {result.connectionInfo.state}</p>
                                <p><span className="font-medium">Database:</span> {result.connectionInfo.database}</p>
                                <p><span className="font-medium">Host:</span> {result.connectionInfo.host}</p>
                                <p><span className="font-medium">Port:</span> {result.connectionInfo.port}</p>
                                <p><span className="font-medium">Collections:</span> {result.connectionInfo.collections.length > 0 ? result.connectionInfo.collections.join(', ') : 'No collections found'}</p>
                            </div>
                        </div>
                    )}

                    {result.error && (
                        <div className="bg-red-100 p-3 rounded border border-red-200 mt-3">
                            <h4 className="font-medium text-red-900 mb-1">Error Details:</h4>
                            <p className="text-sm text-red-700">{result.error}</p>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                        Tested at: {new Date(result.timestamp).toLocaleString()}
                    </p>
                </div>
            )}
        </div>
    );
}