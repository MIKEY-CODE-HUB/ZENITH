'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { FocusGoal } from '@/lib/types';

export function FocusGoals({ onStart }: { onStart: (goal: FocusGoal) => void }) {
  const [goals, setGoals] = useState<FocusGoal[]>([]);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getFocusGoals().then(result => {
      if (cancelled) return;
      setGoals(result.goals);
      setAvailable(true);
    }).catch(error => {
      if (cancelled || (error instanceof ApiError && error.status === 404)) return;
      setAvailable(true);
      setError('Could not load focus goals.');
    });
    return () => { cancelled = true; };
  }, []);

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSaving(true);
    setError('');
    try {
      const { goal } = await api.createFocusGoal({
        title: String(fields.get('title') ?? ''), outcome: String(fields.get('outcome') ?? ''),
        targetMinutes: Number(fields.get('targetMinutes')), dueDate: String(fields.get('dueDate') ?? ''),
        notes: String(fields.get('notes') ?? ''),
      });
      setGoals(current => [goal, ...current]);
      form.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not add the goal.');
    } finally {
      setSaving(false);
    }
  }

  async function changeCompletion(goal: FocusGoal) {
    setSaving(true);
    setError('');
    try {
      await api.completeFocusGoal(goal.id, !goal.completedAt);
      setGoals(current => current.map(item => item.id === goal.id
        ? { ...item, completedAt: goal.completedAt ? null : new Date().toISOString() }
        : item));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the goal.');
    } finally {
      setSaving(false);
    }
  }

  if (!available) return null;
  const field = 'block w-full rounded-lg border border-[rgb(var(--tint))]/15 bg-transparent px-3 py-2 text-sm';
  return (
    <section className="space-y-4 rounded-2xl border border-[rgb(var(--tint))]/10 cozy-glass bg-[rgb(var(--panel))] p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Focus goals</h2>
      {error && <p role="alert" className="text-sm text-[rgb(var(--ink))]">{error}</p>}
      {goals.length === 0 && <p className="text-sm text-[rgb(var(--ink-muted))]">Plan something you can work on across several sessions.</p>}
      <ul className="space-y-3">
        {goals.map(goal => (
          <li key={goal.id} className="space-y-2 rounded-xl border border-[rgb(var(--tint))]/10 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{goal.title}</h3>
                {goal.dueDate && <p className="text-xs text-[rgb(var(--ink-muted))]">Due {goal.dueDate.slice(0, 10)}</p>}
              </div>
              <span className="text-sm tabular-nums">{goal.focusedMinutes} / {goal.targetMinutes} min</span>
            </div>
            {goal.outcome && <p className="text-sm">{goal.outcome}</p>}
            {goal.notes && <p className="whitespace-pre-wrap text-sm text-[rgb(var(--ink-muted))]">{goal.notes}</p>}
            <progress className="h-1.5 w-full accent-emerald-500" aria-label={`${goal.title} progress`}
              value={Math.min(goal.focusedMinutes, goal.targetMinutes)} max={goal.targetMinutes} />
            <div className="flex flex-wrap gap-4 text-sm">
              {goal.completedAt ? <span>Completed</span> : <button type="button" className="underline" onClick={() => onStart(goal)}>Focus on this</button>}
              <button type="button" className="underline" disabled={saving} onClick={() => void changeCompletion(goal)}>
                {goal.completedAt ? 'Reopen' : 'Mark complete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <details className="space-y-3">
        <summary className="cursor-pointer font-medium">Add a goal</summary>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={addGoal}>
          <label className="text-sm">Goal title<input className={field} name="title" required maxLength={120} /></label>
          <label className="text-sm">Target minutes<input className={field} name="targetMinutes" type="number" required min={5} max={10080} defaultValue={120} /></label>
          <label className="text-sm">Outcome (optional)<input className={field} name="outcome" maxLength={250} /></label>
          <label className="text-sm">Due date (optional)<input className={field} name="dueDate" type="date" /></label>
          <label className="text-sm sm:col-span-2">Notes (optional)<textarea className={field} name="notes" rows={2} maxLength={1000} /></label>
          <button disabled={saving} className="w-fit rounded-lg bg-[rgb(var(--action))] px-4 py-2 text-sm font-medium text-[rgb(var(--action-ink))] disabled:opacity-50">
            Add goal
          </button>
        </form>
      </details>
    </section>
  );
}
