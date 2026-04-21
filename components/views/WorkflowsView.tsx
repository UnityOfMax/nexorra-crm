'use client';
import dynamic from 'next/dynamic';
import type { SubAccount } from '../Sidebar';
const WorkflowList = dynamic(() => import('../workflows/WorkflowList'), { ssr: false });

interface WorkflowsViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function WorkflowsView({ sub, accountId, userId }: WorkflowsViewProps) {
  return <WorkflowList accountId={accountId} userId={userId} />;
}
