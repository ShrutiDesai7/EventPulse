interface LoadingProps {
  label?: string;
}

export function Loading({ label = 'Loading' }: LoadingProps) {
  return <div className="loading-state" role="status"><span className="spinner" /><span>{label}</span></div>;
}
