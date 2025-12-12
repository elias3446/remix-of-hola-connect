import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/hooks/controlador/useSignOut';
import { LogOut, User } from 'lucide-react';

interface DashboardHeaderProps {
  userEmail?: string;
}

export const DashboardHeader = memo(function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  const { signOut, loading } = useSignOut();

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        
        <div className="flex items-center gap-4">
          {userEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{userEmail}</span>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {loading ? 'Cerrando...' : 'Cerrar sesión'}
          </Button>
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
