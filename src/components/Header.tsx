"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-slate-800">Finance Overview</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {session?.user && (
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-700">{session.user.name}</span>
              <span className="text-xs text-slate-500 capitalize">{session.user.role?.toLowerCase()}</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
              <UserIcon size={18} />
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
