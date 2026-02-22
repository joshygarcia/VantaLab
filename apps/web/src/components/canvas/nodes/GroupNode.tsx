type GroupNodeProps = {
  data: {
    label: string;
  };
};

export function GroupNode({ data }: GroupNodeProps) {
  return (
    <div className="min-w-[240px] rounded-xl border border-white/5 bg-ink-950/80 p-4 text-sm font-medium text-white shadow-panel backdrop-blur-sm">
      {data.label}
    </div>
  );
}
