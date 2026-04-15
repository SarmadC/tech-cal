import type { ComponentProps } from "react"

import { BrandLoadingLogo } from "@/components/brand/BrandLoadingLogo"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: ComponentProps<"span">) {
    return (
        <BrandLoadingLogo
            className={cn("size-4", className)}
            inline
            size={16}
            {...props}
        />
    )
}

export { Spinner }
