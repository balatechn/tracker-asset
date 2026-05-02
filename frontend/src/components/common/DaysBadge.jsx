'use client';
import { clsx } from 'clsx';

export default function DaysBadge({ days }) {
  if (days === null || days === undefined || days === '') {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const d = parseInt(days);

  let cls, dot, label;

  if (d < 0) {
    cls = 'bg-red-100 text-red-700 border-red-300';
    dot = 'bg-red-500';
    label = 'Expired';
  } else if (d === 0) {
    cls = 'bg-red-100 text-red-700 border-red-300';
    dot = 'bg-red-500';
    label = 'Today!';
  } else if (d <= 15) {
    cls = 'bg-red-100 text-red-700 border-red-200';
    dot = 'bg-red-500';
    label = `${d}d`;
  } else if (d <= 60) {
    cls = 'bg-amber-100 text-amber-700 border-amber-200';
    dot = 'bg-amber-500';
    label = `${d}d`;
  } else {
    cls = 'bg-green-100 text-green-700 border-green-200';
    dot = 'bg-green-500';
    label = `${d}d`;
  }

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', cls)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
