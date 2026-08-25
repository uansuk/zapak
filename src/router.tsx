import { useEffect, useState, type ReactNode } from 'react';

export function getPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function navigate(to: string) {
  if (getPath() === to) return;
  window.location.hash = to;
}

export function useRoute(): string {
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const fn = () => setPath(getPath());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return path;
}

export function Link({ to, className = '', children, onClick }: { to: string; className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={() => { onClick?.(); }}
    >
      {children}
    </a>
  );
}
