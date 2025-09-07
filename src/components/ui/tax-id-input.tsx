import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

interface TaxIdInputProps extends Omit<React.ComponentProps<"input">, "type" | "inputMode" | "pattern"> {
  maxLength?: number;
}

const TaxIdInput = React.forwardRef<HTMLInputElement, TaxIdInputProps>(
  ({ className, maxLength = 8, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const taxIdRegex = /^[0-9]*$/;
      
      if (taxIdRegex.test(value) || value === '') {
        onChange?.(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={maxLength}
        className={cn(className)}
        onChange={handleChange}
        {...props}
      />
    )
  }
)

TaxIdInput.displayName = "TaxIdInput"

export { TaxIdInput }