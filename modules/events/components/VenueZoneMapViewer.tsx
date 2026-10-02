"use client"

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch"

import { Button } from "@/components/ui/button"
import { VenueZoneMap } from "@/modules/events/components/VenueZoneMap"

type VenueZoneMapViewerProps = Parameters<typeof VenueZoneMap>[0]

export function VenueZoneMapViewer({ zones, onZoneSelect }: VenueZoneMapViewerProps) {
  return (
    <TransformWrapper minScale={1} maxScale={4} limitToBounds>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Acercar mapa"
              onClick={() => zoomIn()}
            >
              <ZoomIn />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Alejar mapa"
              onClick={() => zoomOut()}
            >
              <ZoomOut />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Restablecer zoom"
              onClick={() => resetTransform()}
            >
              <RotateCcw />
            </Button>
          </div>
          {/*
            No se pasa la prop `keyboard` (queda en su default `{ disabled: true }`):
            verificado en node_modules/react-zoom-pan-pinch/src/core/keyboard/keyboard.logic.ts
            y transform-component.tsx que, con ese default, el wrapper no recibe
            tabIndex propio y su listener nativo de "keydown" retorna sin hacer nada
            (sin preventDefault/stopPropagation), por lo que Enter/Espacio sobre los
            <g role="button" tabIndex={0}> de VenueZoneMap siguen llegando normalmente
            al onKeyDown de React. No se activa a propósito: ampliar la navegación por
            teclado del zoom queda fuera de alcance de esta spec.
          */}
          <TransformComponent
            wrapperStyle={{ width: "100%" }}
            contentStyle={{ width: "100%" }}
          >
            <VenueZoneMap zones={zones} onZoneSelect={onZoneSelect} />
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  )
}
