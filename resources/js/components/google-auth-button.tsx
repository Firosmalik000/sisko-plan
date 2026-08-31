import { Button } from '@/components/ui/button';
import { redirect } from '@/routes/auth/google';

type Props = {
    label: string;
};

export default function GoogleAuthButton({ label }: Props) {
    return (
        <Button asChild variant="outline" className="h-11 w-full">
            <a href={redirect.url()}>
                <GoogleIcon />
                {label}
            </a>
        </Button>
    );
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.39 13.86a6.02 6.02 0 0 1 0-3.72V7.52H3.04a10 10 0 0 0 0 8.96l3.35-2.62Z"
            />
            <path
                fill="#EA4335"
                d="M12 6.01c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"
            />
        </svg>
    );
}
