import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'react-router-dom';
import { generateBreadcrumbs } from '@/routes';
import { ChevronRight } from 'lucide-react';

export const Header = () => {
  const { getUserInfo, removeUser } = useAuth();
  const userInfo = getUserInfo();
  const location = useLocation();
  const breadcrumbs = generateBreadcrumbs(location.pathname);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Multi-Agent Management</h2>
            <div className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              Demo Project
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="w-4 h-4" />}
                {crumb.path ? (
                  <Link 
                    to={crumb.path} 
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.title}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{crumb.title}</span>
                )}
              </div>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Welcome, </span>
            <span className="font-medium">{userInfo.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
              {userInfo.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            
            <button
              onClick={() => removeUser()}
              className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};