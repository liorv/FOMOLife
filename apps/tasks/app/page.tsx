import TasksPage from '../components/TasksPage';
import { getTasksSession } from '@/lib/server/tasksAuth';
import { getTasksServerEnv } from '@/lib/tasksEnv.server';

export default async function TasksHomePage() {
  getTasksServerEnv();
  const session = await getTasksSession();
  return <TasksPage canManage={session.isAuthenticated} />;
}