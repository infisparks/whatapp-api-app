'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    currentOrganization?: {
      name: string;
      role: string;
    };
  } | null;
  hasActiveConnection?: boolean;
}

export function DashboardClientLayout({
  children,
  user,
  hasActiveConnection,
}: DashboardClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        <Header
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          hasActiveConnection={hasActiveConnection}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
