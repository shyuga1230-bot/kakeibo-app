interface CategoryBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ name, color, size = 'md' }: CategoryBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, backgroundColor: color }}
      />
      {name}
    </span>
  );
}
