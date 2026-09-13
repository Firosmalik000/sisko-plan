import { usePage } from '@inertiajs/react';
import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';
import { useTranslation } from '@/lib/i18n';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const { t } = useTranslation();
    const { component } = usePage();
    const isLoginPage = component === 'auth/login';
    const resolvedTitle = title || (isLoginPage ? 'Sign in to your account' : title);
    const resolvedDescription = description || (isLoginPage ? 'Use Google or your email' : description);

    return (
        <AuthLayoutTemplate title={t(resolvedTitle)} description={t(resolvedDescription)}>
            {children}
        </AuthLayoutTemplate>
    );
}
