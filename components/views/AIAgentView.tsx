'use client';
import dynamic from 'next/dynamic';
import type { SubAccount } from '../Sidebar';
const AIAgent = dynamic(() => import('../AIAgent'), { ssr: false });

interface AIAgentViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function AIAgentView({ sub, accountId, userId }: AIAgentViewProps) {
  return <AIAgent accountId={accountId} />;
}
