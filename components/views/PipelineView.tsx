'use client';
import dynamic from 'next/dynamic';
import type { SubAccount } from '../Sidebar';
const PipelineManager = dynamic(() => import('../pipelines/PipelineManager'), { ssr: false });

interface PipelineViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function PipelineView({ sub, accountId, userId }: PipelineViewProps) {
  return <PipelineManager accountId={accountId} />;
}
