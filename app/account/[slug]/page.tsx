import { Suspense } from 'react';
import SubAccountPage from './SubAccountPage';

interface Props {
  params: { slug: string };
  searchParams: { view?: string };
}

export default function AccountSlugPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    }>
      <SubAccountPage slug={params.slug} initialView={searchParams.view} />
    </Suspense>
  );
}
