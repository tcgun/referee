"use client";

import { cn } from "@/lib/utils";

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted/60", className)}
            {...props}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    );
}

export function SkeletonLine() {
    return <Skeleton className="h-4 w-full" />;
}
