'use client';
// InstagramView wraps the existing InstagramDMs component.
import dynamic from 'next/dynamic';
const InstagramDMs = dynamic(() => import('../InstagramDMs'), { ssr: false });
export default InstagramDMs;
