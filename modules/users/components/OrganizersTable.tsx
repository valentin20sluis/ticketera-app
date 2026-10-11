import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, StatusBadge } from "@/modules/users/components/UsersTable";
import type { OrganizerRow } from "@/modules/users/services/organizer-list.service";
import { formatShortDate } from "@/modules/users/utils/format-date";

export function OrganizersTable({ rows }: { rows: OrganizerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No hay organizadores que coincidan.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organizador</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Registro</TableHead>
            <TableHead className="text-right">Eventos activos</TableHead>
            <TableHead className="text-right">Eventos totales</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={row.fullName} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge suspended={row.isSuspended} />
              </TableCell>
              <TableCell>{formatShortDate(row.createdAt)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.activeEvents}</TableCell>
              <TableCell className="text-right tabular-nums">{row.totalEvents}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
