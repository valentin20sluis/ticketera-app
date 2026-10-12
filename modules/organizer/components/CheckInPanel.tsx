"use client";

import { useRef, useState } from "react";
import { SelectField } from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { checkInTicketAction } from "@/modules/organizer/actions/check-in.actions";
import { CheckInResultCard } from "@/modules/organizer/components/CheckInResultCard";
import { QrScanner } from "@/modules/organizer/components/QrScanner";
import type { CheckInEvent, CheckInResult, CheckInStats } from "@/modules/organizer/services/check-in.service";

type CheckInPanelProps = { events: CheckInEvent[] };

export function CheckInPanel({ events }: CheckInPanelProps) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [stats, setStats] = useState<Record<string, CheckInStats>>(() =>
    Object.fromEntries(events.map((e) => [e.id, { sold: e.sold, entered: e.entered }])),
  );
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const current = stats[eventId];

  function changeEvent(next: string) {
    setEventId(next);
    setResult(null);
    setError(null);
  }

  async function validate(rawCode: string) {
    if (pending.current || !eventId) return;
    pending.current = true;
    setBusy(true);
    try {
      const res = await checkInTicketAction({ eventId, code: rawCode });
      if (res.ok) {
        setResult(res.outcome.result);
        setError(null);
        setStats((prev) => ({ ...prev, [eventId]: res.outcome.stats }));
        if (res.outcome.result.status === "admitted") setCode("");
      } else {
        setResult(null);
        setError(res.error);
      }
    } catch {
      setResult(null);
      setError("No se pudo validar la entrada. Inténtalo de nuevo");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="check-in-event" className="text-sm font-medium">
          Evento
        </label>
        <SelectField
          id="check-in-event"
          options={events.map((e) => ({ value: e.id, label: e.title }))}
          value={eventId}
          onValueChange={changeEvent}
        />
      </div>

      <Card>
        <CardContent className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Ingresados / vendidos</span>
          <span className="text-2xl font-semibold tabular-nums">
            {current ? `${current.entered} / ${current.sold}` : "-"}
          </span>
        </CardContent>
      </Card>

      <CheckInResultCard result={result} error={error} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <QrScanner onScan={validate} busy={busy} />
        </CardContent>
      </Card>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void validate(code);
        }}
      >
        <label htmlFor="check-in-code" className="text-sm font-medium">
          Ingreso manual
        </label>
        <div className="flex gap-2">
          <Input
            id="check-in-code"
            className="h-10"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de la entrada"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Button type="submit" className="h-10" disabled={busy || !code.trim()}>
            Validar
          </Button>
        </div>
      </form>
    </div>
  );
}
