'use client';
// CommandCenterView wraps the existing CommandCenterV2 component.
import dynamic from 'next/dynamic';
const CommandCenterV2 = dynamic(() => import('../command-center/CommandCenterV2'), { ssr: false });
export default CommandCenterV2;
