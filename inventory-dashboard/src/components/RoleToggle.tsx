import React from 'react';
import { Briefcase, Package } from 'lucide-react';

export type UserRole = 'founder' | 'warehouse';

interface RoleToggleProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleToggle: React.FC<RoleToggleProps> = ({ activeRole, onRoleChange }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Role
      </span>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onRoleChange('founder')}
          className={`
            flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            transition-all duration-200
            ${activeRole === 'founder'
              ? 'bg-vyndo-primary-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
          title="Founder View"
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Founder</span>
        </button>
        <button
          onClick={() => onRoleChange('warehouse')}
          className={`
            flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            transition-all duration-200
            ${activeRole === 'warehouse'
              ? 'bg-vyndo-primary-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
          title="Warehouse Team View"
        >
          <Package className="h-3.5 w-3.5" />
          <span>Warehouse Team</span>
        </button>
      </div>
    </div>
  );
};
