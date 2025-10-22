import { Projects, ProjectDetail, Agents, Tools, MainAgent, Config, Deploy } from '@/pages';

// Define route configuration with metadata
export interface AppRoute {
  path: string;
  element: React.ReactElement;
  title?: string;
  description?: string;
  icon?: string;
  showInNav?: boolean;
}

// Main application routes
export const routes: AppRoute[] = [
  {
    path: '/',
    element: <Projects />,
    title: 'Projects',
    description: 'Manage your multi-agent system projects',
    icon: 'FolderOpen',
    showInNav: true,
  },
  {
    path: '/projects',
    element: <Projects />,
    title: 'Projects',
    description: 'Manage your multi-agent system projects',
    icon: 'FolderOpen',
    showInNav: false,
  },
  {
    path: '/projects/:projectId',
    element: <ProjectDetail />,
    title: 'Project Details',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/agents',
    element: <Agents />,
    title: 'Agents',
    description: 'Manage AI agents and their configurations',
    icon: 'Bot',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/agents/:agentId',
    element: <Agents />, // Will handle agent details view
    title: 'Agent Details',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/tools',
    element: <Tools />,
    title: 'Tools',
    description: 'Create and manage custom and built-in tools',
    icon: 'Wrench',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/tools/:toolId',
    element: <Tools />, // Will handle tool details view
    title: 'Tool Details',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/main-agent',
    element: <MainAgent />,
    title: 'Main Agent',
    description: 'Configure the main orchestrator agent',
    icon: 'Brain',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/config',
    element: <Config />,
    title: 'Environment Variables',
    description: 'Configure environment variables',
    icon: 'Settings',
    showInNav: false,
  },
  {
    path: '/projects/:projectId/deploy',
    element: <Deploy />,
    title: 'Deploy',
    description: 'Deploy and monitor your multi-agent system',
    icon: 'Rocket',
    showInNav: false,
  },
];

// Navigation routes (filtered for sidebar)
export const navigationRoutes = routes.filter(route => route.showInNav);

// Route utilities
export const getRouteByPath = (path: string): AppRoute | undefined => {
  return routes.find(route => route.path === path);
};

export const getRouteTitle = (pathname: string): string => {
  const route = routes.find(route => {
    if (route.path === pathname) return true;
    // Handle dynamic routes like /agents/:id
    if (route.path?.includes(':')) {
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(pathname);
    }
    return false;
  });
  
  return route?.title || 'Multi-Agent Management';
};

// Breadcrumb generation
export const generateBreadcrumbs = (pathname: string): Array<{ title: string; path?: string }> => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ title: string; path?: string }> = [
    { title: 'Projects', path: '/' }
  ];

  if (segments.length === 0) {
    return [{ title: 'Projects' }];
  }

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Handle dynamic segments
    if (segment.match(/^[a-f0-9-]{36}$/) || segment.match(/^\d+$/)) {
      // This looks like an ID, use the parent route's title + "Details"
      const parentRoute = getRouteByPath(currentPath.replace(`/${segment}`, ''));
      breadcrumbs.push({
        title: `${parentRoute?.title || 'Item'} Details`,
        path: index === segments.length - 1 ? undefined : currentPath
      });
    } else {
      const route = getRouteByPath(currentPath);
      breadcrumbs.push({
        title: route?.title || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: index === segments.length - 1 ? undefined : currentPath
      });
    }
  });

  return breadcrumbs;
};