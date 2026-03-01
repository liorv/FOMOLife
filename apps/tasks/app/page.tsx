import { Suspense } from 'react';
import TasksPage from '../components/TasksPage';
import { getTasksSession } from '@/lib/server/tasksAuth';
import { getTasksServerEnv } from '@/lib/tasksEnv.server';

export default async function TasksHomePage() {
  getTasksServerEnv();
  const session = await getTasksSession();
  return (
    <Suspense fallback={null}>
      <TasksPage canManage={session.isAuthenticated} />
    </Suspense>
  );
}