'use client';

import React, { useState, useEffect } from 'react';

interface ZapierStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  cardsGenerated: number;
  lastRequest: string;
  popularContentTypes: Array<{ type: string; count: number }>;
  aiProviderUsage: Array<{ provider: string; count: number }>;
}

interface RecentActivity {
  id: string;
  timestamp: string;
  contentType: string;
  aiProvider: string;
  cardsGenerated: number;
  status: 'success' | 'failed';
  title: string;
}

export default function ZapierDashboard() {
  const [stats, setStats] = useState<ZapierStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageProcessingTime: 0,
    cardsGenerated: 0,
    lastRequest: '',
    popularContentTypes: [],
    aiProviderUsage: []
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - replace with actual API calls
      setStats({
        totalRequests: 156,
        successfulRequests: 142,
        failedRequests: 14,
        averageProcessingTime: 3.2,
        cardsGenerated: 1847,
        lastRequest: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        popularContentTypes: [
          { type: 'text', count: 89 },
          { type: 'file_analysis', count: 45 },
          { type: 'class_files', count: 22 }
        ],
        aiProviderUsage: [
          { provider: 'gemini', count: 98 },
          { provider: 'chatgpt', count: 58 }
        ]
      });

      setRecentActivity([
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          contentType: 'text',
          aiProvider: 'gemini',
          cardsGenerated: 12,
          status: 'success',
          title: 'Biology Study Guide'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          contentType: 'file_analysis',
          aiProvider: 'chatgpt',
          cardsGenerated: 8,
          status: 'success',
          title: 'History Chapter 5'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          contentType: 'class_files',
          aiProvider: 'gemini',
          cardsGenerated: 0,
          status: 'failed',
          title: 'Math Equations'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  const successRate = stats.totalRequests > 0 
    ? Math.round((stats.successfulRequests / stats.totalRequests) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">📊</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Zapier Dashboard</h2>
            <p className="text-gray-600">Monitor your AI flashcard automation</p>
          </div>
        </div>
        <button 
          onClick={fetchDashboardData} 
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Total Requests</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalRequests}</div>
          <p className="text-xs text-gray-600">
            Last request {stats.lastRequest ? formatTimeAgo(stats.lastRequest) : 'Never'}
          </p>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Success Rate</h3>
            <span className="text-2xl">📈</span>
          </div>
          <div className="text-2xl font-bold">{successRate}%</div>
          <p className="text-xs text-gray-600">
            {stats.successfulRequests} successful, {stats.failedRequests} failed
          </p>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Cards Generated</h3>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-2xl font-bold">{stats.cardsGenerated}</div>
          <p className="text-xs text-gray-600">
            Avg {Math.round(stats.cardsGenerated / Math.max(stats.successfulRequests, 1))} per request
          </p>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Avg Processing Time</h3>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="text-2xl font-bold">{stats.averageProcessingTime}s</div>
          <p className="text-xs text-gray-600">
            Response time
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">Content Types</h3>
            <p className="text-gray-600">Distribution of content types processed</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats.popularContentTypes.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 border rounded text-xs">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(item.count / Math.max(...stats.popularContentTypes.map(t => t.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">AI Provider Usage</h3>
            <p className="text-gray-600">Usage distribution across AI providers</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats.aiProviderUsage.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      item.provider === 'gemini' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <span className="capitalize">{item.provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.provider === 'gemini' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${(item.count / Math.max(...stats.aiProviderUsage.map(p => p.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <p className="text-gray-600">Latest Zapier webhook requests</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {activity.status === 'success' ? (
                    <span className="text-green-500 text-xl">✅</span>
                  ) : (
                    <span className="text-red-500 text-xl">❌</span>
                  )}
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-1 border rounded text-xs">
                        {activity.contentType}
                      </span>
                      <span className="px-2 py-1 border rounded text-xs">
                        {activity.aiProvider}
                      </span>
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {activity.status === 'success' ? (
                    <p className="text-sm font-medium">{activity.cardsGenerated} cards</p>
                  ) : (
                    <p className="text-sm text-red-600">Failed</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}