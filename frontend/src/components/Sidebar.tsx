'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Radio,
  Shield,
  BarChart3,
  History,
  Trophy,
  Award,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Rooms', href: '/rooms', icon: Radio, badge: 'Live' },
    { label: 'Distraction Shield', href: '/blocker', icon: Shield },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'History', href: '/history', icon: History },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-white/[0.07] bg-[#0c0c0f] p-3 shrink-0 min-h-[calc(100vh-4rem)] justify-between transition-all duration-200 select-none ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      <div className="space-y-4">
        {/* Header & Toggle */}
        <div className="flex items-center justify-between px-2 pt-1">
          {!collapsed && (
            <span className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Workspace
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors ml-auto"
            title={collapsed ? 'Expand Menu' : 'Collapse Menu'}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className={`p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="relative shrink-0">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                alt={user.name}
                className="h-8 w-8 rounded-lg object-cover bg-zinc-800 border border-white/10"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0c0c0f]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">{user.name}</p>
                <span className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-normal">
                  Shield active
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Links */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                } rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile shortcut */}
      <div className="pt-3 border-t border-white/[0.06]">
        <Link
          href="/profile"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Account Settings"
        >
          <User className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Account & Plan</span>}
        </Link>
      </div>
    </aside>
  );
}
