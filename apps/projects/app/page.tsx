import { Suspense } from 'react';
import ProjectsPage from '../components/ProjectsPage';
import { getProjectsSession } from '@/lib/server/projectsAuth';
import { getProjectsServerEnv } from '@/lib/projectsEnv.server';

export default async function ProjectsHomePage() {
  getProjectsServerEnv();
  const session = await getProjectsSession();
  return (
    <Suspense fallback={null}>
      <ProjectsPage canManage={session.isAuthenticated} />
    </Suspense>
  );
}
