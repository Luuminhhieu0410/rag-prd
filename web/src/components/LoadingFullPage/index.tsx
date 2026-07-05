import * as React from "react";
import {LoaderIcon} from "lucide-react";
import {cn} from "@/lib/utils.ts";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <LoaderIcon
            role="status"
            aria-label="Loading"
            className={cn("size-4 animate-spin", className)}
            {...props}
        />
    )
}
export  function FullPageLoader() {
    return (
        <div className="grid min-h-screen place-items-center text-muted-foreground">
            <Spinner className="size-8" />
        </div>
    );
}