import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  UploadCloud,
  Megaphone,
  Menu,
  X
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PlatformSwitcher } from './PlatformSwitcher';
import { CloudSyncIndicator } from './CloudSyncIndicator';
import { RoleToggle, type UserRole } from './RoleToggle';
import { UserPreferenceService } from '../services/UserPreferenceService';
import type { Platform, InventoryItem } from '../types';
import { PLATFORM } from '../types';
import { hasStockoutAlert } from '../utils/stockoutAlerts';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: 'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management' | 'marketing-analysis' | 'executive-dashboard' | 'regional-operations';
  onViewChange: (view: 'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management' | 'marketing-analysis' | 'executive-dashboard' | 'regional-operations') => void;
  activePlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
  cloudSyncStatus?: 'syncing' | 'synced' | 'offline' | 'error';
  activeRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  inventoryData?: InventoryItem[];
}

interface NavItem {
  id: 'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management' | 'marketing-analysis' | 'executive-dashboard' | 'regional-operations';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[]; // Which roles can see this nav item
}

const navItems: NavItem[] = [
  { id: 'executive-dashboard', label: 'Executive Dashboard', icon: TrendingUp, roles: ['founder'] },
  { id: 'sales', label: 'Sales Performance', icon: TrendingUp, roles: ['founder'] },
  { id: 'marketing-analysis', label: 'Marketing Analysis', icon: Megaphone, roles: ['founder'] },
  { id: 'data-management', label: 'Data Management', icon: UploadCloud, roles: ['founder'] },
  { id: 'regional-operations', label: 'Regional Operations', icon: Package, roles: ['warehouse'] },
  { id: 'inventory', label: 'Inventory Health', icon: Package, roles: ['warehouse'] },
  { id: 'action-center', label: 'Action Center', icon: AlertCircle, roles: ['warehouse'] },
];

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  activeView, 
  onViewChange,
  activePlatform = PLATFORM.BLINKIT,
  onPlatformChange = () => {},
  cloudSyncStatus = 'offline',
  activeRole = 'founder',
  onRoleChange = () => {},
  inventoryData = []
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Calculate stockout alert for Regional Operations
  const showStockoutAlert = hasStockoutAlert(inventoryData);

  // Initialize active view from user preferences
  useEffect(() => {
    const savedActiveTab = UserPreferenceService.getActiveTab();
    if (savedActiveTab && savedActiveTab !== activeView) {
      onViewChange(savedActiveTab as typeof activeView);
    }
  }, []);

  // Save active view to preferences when it changes
  useEffect(() => {
    UserPreferenceService.setActiveTab(activeView);
  }, [activeView]);

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-900 overflow-hidden transition-colors duration-300 gap-12"> {/* Added gap-12 between sidebar and main */}
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-700/60 
          flex flex-col shadow-lg dark:shadow-2xl flex-shrink-0
          transform transition-all duration-300 ease-in-out lg:transform-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          backgroundColor: 'white', 
          opacity: 1,
          zIndex: 100
        }}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/60 dark:border-slate-700/60 flex-shrink-0"> {/* Subtle borders */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-vyndo-primary-500 dark:bg-vyndo-primary-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-orange-500/20"> {/* Large rounded corners */}
              <span className="text-white font-bold text-sm"></span>
            </div>
            <span className="font-semibold text-xl transition-colors duration-300" style={{ color: '#ef5326', letterSpacing: '-0.02em' }}>
              Vyndo
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-2xl focus:outline-none focus:ring-2 focus:ring-vyndo-primary-500 dark:focus:ring-vyndo-primary-400 transition-colors duration-200" // Large rounded corners
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Platform Switcher */}
        <div className="px-4 py-6 border-b border-slate-200/60 dark:border-slate-700/60 mt-8">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Platform
            </h3>
          </div>
          <PlatformSwitcher
            activePlatform={activePlatform}
            onPlatformChange={onPlatformChange}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 pt-6 space-y-2 overflow-y-auto">
          {navItems
            .filter(item => item.roles.includes(activeRole))
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const hasAlert = item.id === 'regional-operations' && showStockoutAlert;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-6 py-3 rounded-2xl
                    transition-all duration-200 text-left font-semibold text-sm
                    focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800
                    relative
                    ${isActive 
                      ? 'text-white shadow-sm' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                  style={isActive ? {
                    backgroundColor: 'var(--platform-primary, #ef5326)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  } : {}}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.7)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {hasAlert && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Sidebar Footer with Role Toggle, Theme Toggle and Cloud Sync */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 flex-shrink-0 space-y-3"> {/* Subtle borders */}
          {/* Cloud Sync Indicator */}
          <CloudSyncIndicator status={cloudSyncStatus} className="mb-3" />
          
          {/* Role Toggle */}
          <RoleToggle activeRole={activeRole} onRoleChange={onRoleChange} />
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme</span> {/* Professional font weight */}
            <ThemeToggle size="sm" />
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center"> {/* Professional font weight */}
            Vyndo Analytics Dashboard
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden"> {/* Added min-w-0 for proper flex behavior */}
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center px-4 flex-shrink-0 shadow-sm dark:shadow-slate-900/20 transition-colors duration-300">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-vyndo-primary-500 dark:focus:ring-vyndo-primary-400 transition-colors duration-200"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 flex items-center space-x-3">
            <div className="w-8 h-8 bg-vyndo-primary-500 dark:bg-vyndo-primary-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-orange-500/20">
              <span className="text-white font-bold text-sm"></span>
            </div>
            <span className="font-semibold text-xl transition-colors duration-300" style={{ color: '#ef5326', letterSpacing: '-0.02em' }}>
              Vyndo
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] dark:bg-slate-900 transition-colors duration-300"> {/* Removed lg:pl-64 */}
          {/* Premium Container - Force Linear Look */}
          <div className="max-w-[1600px] mx-auto w-full px-12 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
