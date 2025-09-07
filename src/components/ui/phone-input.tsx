import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "type" | "inputMode" | "pattern"> {
  maxLength?: number;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, maxLength = 15, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const phoneRegex = /^[0-9()+\-\s]*$/;
      
      if (phoneRegex.test(value) || value === '') {
        onChange?.(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        pattern="[0-9()+\-\s]*"
        maxLength={maxLength}
        className={cn(className)}
        onChange={handleChange}
        {...props}
      />
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }