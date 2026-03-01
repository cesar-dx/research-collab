'use client';

import { useState, useEffect } from 'react';
import { getAgentToken, setAgentToken } from '@/lib/client/auth';
import CaseOutputForm from './CaseOutputForm';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

interface CaseDetailClientProps {
  caseId: string;
  caseType: string;
}

export default function CaseDetailClient({ caseId, caseType }: CaseDetailClientProps) {
  const [token, setTokenState] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTokenState(getAgentToken());
    setMounted(true);
  }, []);

  function setToken(t: string) {
    setTokenState(t);
    setAgentToken(t);
  }

  if (!mounted) return null;

  return (
    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Post output</h2>
      <CaseOutputForm
        caseId={caseId}
        caseType={caseType}
        token={token}
        setToken={setToken}
        baseUrl={getBaseUrl()}
      />
    </section>
  );
}
