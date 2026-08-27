'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Smartphone,
  QrCode,
  LayoutTemplate,
  Megaphone,
  Send,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'WhatsApp Platform',
      items: [
        { label: 'WhatsApp Accounts', href: '/dashboard/whatsapp', icon: Smartphone },
        { label: 'Connect WhatsApp', href: '/dashboard/whatsapp/connect', icon: QrCode, highlight: true },
        { label: 'Live Inbox', href: '/dashboard/inbox', icon: MessageSquare, badge: 'Live' },
        { label: 'Send Message', href: '/dashboard/messages/send', icon: Send },
        { label: 'Templates', href: '/dashboard/templates', icon: LayoutTemplate },
        { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
        { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
      ],
    },
    {
      group: 'Management',
      items: [
        { label: 'Settings & Webhooks', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
              WhatsApp <span className="text-indigo-600 font-extrabold">Cloud</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Coexistence Ready</p>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      item.highlight && !isActive && 'text-indigo-600 bg-indigo-50/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive
                            ? 'text-indigo-600'
                            : 'text-slate-400 group-hover:text-slate-600',
                          item.highlight && !isActive && 'text-indigo-500'
                        )}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Meta Badge */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-800 truncate">Meta Cloud API v26.0</p>
              <p className="text-[10px] text-slate-400 truncate">Embedded Signup v4</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
