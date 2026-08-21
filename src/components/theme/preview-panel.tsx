import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Search, Users } from 'lucide-react';

/**
 * Live preview of the draft theme: a miniature of the dashboard showing
 * buttons, badges, forms, tables, navigation and status indicators — all
 * rendered from the current CSS variables.
 */
export function PreviewPanel() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Navigation mock */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground">
            <Building2 className="size-3.5" />
          </span>
          Acme Inc.
        </div>
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5 text-xs font-medium text-muted-foreground">
          <span className="rounded bg-primary px-2 py-1 text-primary-foreground">Overview</span>
          <span className="px-2 py-1">Employees</span>
          <span className="px-2 py-1">Reports</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="destructive">
          Delete
        </Button>
      </div>

      {/* Badges / status indicators */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="success">Active</Badge>
        <Badge variant="warning">On leave</Badge>
        <Badge variant="destructive">Overdue</Badge>
        <Badge variant="info">New</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>

      {/* Form */}
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label htmlFor="preview-search">Search</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="preview-search" placeholder="Find an employee…" className="pl-8" />
          </div>
          <Button size="sm" variant="success">
            Go
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Ada Lovelace', status: 'Active' as const },
              { name: 'Alan Turing', status: 'On leave' as const },
              { name: 'Grace Hopper', status: 'Active' as const },
            ].map((row) => (
              <tr key={row.name} className="border-t border-border">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <Badge
                    variant={row.status === 'Active' ? 'success' : 'warning'}
                    className="text-[10px]"
                  >
                    {row.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3.5" /> Onboarding
          </span>
          <span className="font-medium">72%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[72%] rounded-full bg-primary" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>Live preview</span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono">--primary: {`var(--primary)`}</span>
      </div>
    </div>
  );
}
