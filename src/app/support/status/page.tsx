"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function SystemStatus() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const services = [
    { name: "API Services", status: "operational", uptime: "99.99%" },
    { name: "AI Summarization", status: "operational", uptime: "99.95%" },
    { name: "Flashcard Generation", status: "operational", uptime: "99.98%" },
    { name: "File Upload", status: "operational", uptime: "99.97%" },
    { name: "Authentication", status: "operational", uptime: "100%" },
    { name: "Database", status: "operational", uptime: "99.99%" },
  ];

  const recentIncidents = [
    {
      date: "2025-01-15",
      title: "Scheduled Maintenance",
      description: "System maintenance completed successfully",
      status: "resolved",
    },
    {
      date: "2025-01-10",
      title: "Performance Optimization",
      description: "AI processing speed improved by 30%",
      status: "resolved",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "outage":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded Performance";
      case "outage":
        return "Service Outage";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-shrink-0" onClick={() => router.push("/")}>
              <Image src="/notewise.png" alt="NoteWise Logo" width={32} height={32} className="sm:w-10 sm:h-10" />
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                NoteWise
              </h1>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-3 py-2 sm:px-6 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            System Status
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Real-time status and uptime information for all NoteWise services
          </p>
        </div>

        {/* Overall Status */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white mb-12 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                <h3 className="text-2xl font-bold">All Systems Operational</h3>
              </div>
              <p className="text-white/90">All services are running smoothly</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80 mb-1">Last Updated</div>
              <div className="text-lg font-semibold">{currentTime.toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden mb-12">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Service Status</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {services.map((service, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{service.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{getStatusText(service.status)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{service.uptime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Uptime Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">99.98%</div>
            <div className="text-gray-600 dark:text-gray-300">Overall Uptime</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 30 days</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">45ms</div>
            <div className="text-gray-600 dark:text-gray-300">Average Response Time</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 24 hours</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">0</div>
            <div className="text-gray-600 dark:text-gray-300">Active Incidents</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current status</div>
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentIncidents.map((incident, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{incident.title}</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{incident.date}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{incident.description}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-full">
                      Resolved
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscribe to Updates */}
        <div className="mt-12 text-center bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">Stay Updated</h3>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Subscribe to receive notifications about system status updates and scheduled maintenance
          </p>
          <button
            onClick={() => router.push("/auth/signup")}
            className="px-8 py-4 bg-white text-teal-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
          >
            Subscribe to Updates
          </button>
        </div>
      </main>
    </div>
  );
}
