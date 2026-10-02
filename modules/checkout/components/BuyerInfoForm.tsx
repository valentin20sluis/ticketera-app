import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { BuyerInfo } from "@/modules/checkout/types/checkout.types"

interface BuyerInfoFormProps {
  values: BuyerInfo
  errors: Partial<Record<string, string>>
  onChange: (field: keyof BuyerInfo, value: string) => void
}

export function BuyerInfoForm({ values, errors, onChange }: BuyerInfoFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Datos del comprador
      </h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="buyer-full-name" className="text-sm font-medium text-foreground">
          Nombre completo <span className="text-destructive">*</span>
        </label>
        <Input
          id="buyer-full-name"
          value={values.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder="Nombre y apellidos"
        />
        {errors["buyer.fullName"] && (
          <p className="text-sm text-destructive">{errors["buyer.fullName"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="buyer-email" className="text-sm font-medium text-foreground">
          Correo electrónico <span className="text-destructive">*</span>
        </label>
        <Input
          id="buyer-email"
          type="email"
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="correo@ejemplo.com"
        />
        {errors["buyer.email"] && (
          <p className="text-sm text-destructive">{errors["buyer.email"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          Documento de identidad <span className="text-destructive">*</span>
        </span>
        <div className="flex items-center gap-3">
          <RadioGroup
            value={values.documentType}
            onValueChange={(value) => onChange("documentType", String(value))}
            className="flex flex-row gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="document-type-dni" value="dni" />
              <label htmlFor="document-type-dni" className="text-sm text-foreground">
                DNI
              </label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="document-type-other" value="other" />
              <label htmlFor="document-type-other" className="text-sm text-foreground">
                Otro
              </label>
            </div>
          </RadioGroup>
          <Input
            id="buyer-document-number"
            value={values.documentNumber}
            onChange={(event) => onChange("documentNumber", event.target.value)}
            placeholder="Número de documento"
            className="flex-1"
          />
        </div>
        {errors["buyer.documentNumber"] && (
          <p className="text-sm text-destructive">{errors["buyer.documentNumber"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="buyer-phone" className="text-sm font-medium text-foreground">
          Celular <span className="text-destructive">*</span>
        </label>
        <Input
          id="buyer-phone"
          value={values.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          placeholder="999999999"
        />
        {errors["buyer.phone"] && (
          <p className="text-sm text-destructive">{errors["buyer.phone"]}</p>
        )}
      </div>
    </div>
  )
}
