'use client';

const STORAGE_KEY = 'regulated_workflow_agent_token';

export function getAgentToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setAgentToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);
}
