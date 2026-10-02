import { jsPDF } from "jspdf"

import { formatPrice } from "@/lib/format-currency"
import { formatFullEventDate } from "@/modules/events/utils/format-event-date"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"
import type { TicketStub } from "@/modules/checkout/utils/build-ticket-stubs"

const QR_RENDER_SIZE_PX = 300
const QR_IMAGE_SIZE_MM = 60
const PAGE_MARGIN_MM = 20
const LINE_HEIGHT_MM = 10

/**
 * Rasteriza un `<svg>` ya renderizado en el DOM a una data URL PNG, sin
 * montar nada visible: serializa el SVG a markup, lo carga en un `Image`
 * off-DOM vía data URL `image/svg+xml` (URI-encoded, no base64 — evita el
 * paso extra de codificar a base64 y es suficiente porque el markup del
 * QR no incluye caracteres que rompan `encodeURIComponent`), lo dibuja en
 * un `<canvas>` también off-DOM y exporta ese canvas como PNG.
 */
async function rasterizeSvgToPngDataUrl(svg: SVGSVGElement): Promise<string> {
  const svgMarkup = new XMLSerializer().serializeToString(svg)
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`

  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("No se pudo rasterizar el código QR."))
    image.src = svgDataUrl
  })

  const canvas = document.createElement("canvas")
  canvas.width = QR_RENDER_SIZE_PX
  canvas.height = QR_RENDER_SIZE_PX

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("No se pudo obtener el contexto 2D del canvas.")
  }

  context.drawImage(image, 0, 0, QR_RENDER_SIZE_PX, QR_RENDER_SIZE_PX)

  return canvas.toDataURL("image/png")
}

function writeTicketStubPage(
  pdf: jsPDF,
  order: ConfirmedOrder,
  stub: TicketStub,
  qrPngDataUrl: string
): void {
  let y = PAGE_MARGIN_MM

  pdf.text(order.eventTitle, PAGE_MARGIN_MM, y)
  y += LINE_HEIGHT_MM
  pdf.text(`${order.venueName}, ${order.city}`, PAGE_MARGIN_MM, y)
  y += LINE_HEIGHT_MM
  pdf.text(formatFullEventDate(order.startDate), PAGE_MARGIN_MM, y)
  y += LINE_HEIGHT_MM
  pdf.text(stub.zoneName, PAGE_MARGIN_MM, y)
  y += LINE_HEIGHT_MM
  pdf.text(formatPrice(stub.price), PAGE_MARGIN_MM, y)
  y += LINE_HEIGHT_MM
  pdf.text(`Entrada ${stub.ticketNumber} de ${stub.totalTickets}`, PAGE_MARGIN_MM, y)
  y += LINE_HEIGHT_MM

  pdf.addImage(qrPngDataUrl, "PNG", PAGE_MARGIN_MM, y, QR_IMAGE_SIZE_MM, QR_IMAGE_SIZE_MM)
}

export async function generateTicketsPdf({
  order,
  stubs,
  qrElements,
}: {
  order: ConfirmedOrder
  stubs: TicketStub[]
  qrElements: SVGSVGElement[]
}): Promise<void> {
  const pdf = new jsPDF()

  for (let index = 0; index < stubs.length; index++) {
    if (index > 0) {
      pdf.addPage()
    }

    const stub = stubs[index]
    const qrElement = qrElements[index]
    const qrPngDataUrl = await rasterizeSvgToPngDataUrl(qrElement)

    writeTicketStubPage(pdf, order, stub, qrPngDataUrl)
  }

  pdf.save(`entradas-${order.orderNumber}.pdf`)
}
