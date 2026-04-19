"use client";

interface Props {
  churchId: string;
  from: string;
  to: string;
}

export function PlanningGrid({ churchId, from, to }: Props) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Planning {from} → {to} for {churchId}
      </p>
      <p className="text-sm">Grid coming in next task.</p>
    </div>
  );
}
