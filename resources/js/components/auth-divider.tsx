export default function AuthDivider() {
    return (
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">
                atau
            </span>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}
