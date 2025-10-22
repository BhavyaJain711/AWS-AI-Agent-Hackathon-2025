import { NavLink, useLocation, useParams } from 'react-router-dom';
import { navigationRoutes } from '@/routes';
import { 
  LayoutDashboard, 
  FolderOpen,
  Bot, 
  Wrench, 
  Settings, 
  Rocket,
  ArrowLeft
} from 'lucide-react';

// Icon mapping for route icons
const iconMap = {
  LayoutDashboard,
  FolderOpen,
  Bot,
  Wrench,
  Settings,
  Rocket,
};

const getIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName as keyof typeof iconMap];
  return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
};

export const Sidebar = () => {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  
  // Check if we're in a project context
  const isInProject = location.pathname.startsWith('/projects/') && projectId;
  
  // Project-specific navigation items
  const projectNavItems = [
    {
      path: `/projects/${projectId}`,
      title: 'Project Overview',
      icon: 'LayoutDashboard',
      description: 'Project dashboard and overview'
    },
    {
      path: `/projects/${projectId}/agents`,
      title: 'Agents',
      icon: 'Bot',
      description: 'Manage AI agents and their configurations'
    },
    {
      path: `/projects/${projectId}/tools`,
      title: 'Tools',
      icon: 'Wrench',
      description: 'Create and manage custom and built-in tools'
    },
    {
      path: `/projects/${projectId}/config`,
      title: 'Configuration',
      icon: 'Settings',
      description: 'System settings and environment variables'
    },
    {
      path: `/projects/${projectId}/deploy`,
      title: 'Deploy',
      icon: 'Rocket',
      description: 'Deploy and monitor your multi-agent system'
    }
  ];

  return (
    <div className="w-64 bg-card border-r border-border">
      <div className="p-6">
        <h1 className="text-xl font-bold">Multi-Agent UI</h1>
      </div>
      
      <nav className="px-4 space-y-2">
        {isInProject ? (
          <>
            {/* Back to Projects */}
            <NavLink
              to="/projects"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </NavLink>
            
            {/* Project Navigation */}
            {projectNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
                title={item.description}
              >
                {getIcon(item.icon)}
                {item.title}
              </NavLink>
            ))}
          </>
        ) : (
          /* Global Navigation */
          navigationRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path!}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
              title={route.description}
            >
              {route.icon && getIcon(route.icon)}
              {route.title}
            </NavLink>
          ))
        )}
      </nav>
    </div>
  );
};