import { Form, Head } from '@inertiajs/react';
import AuthDivider from '@/components/auth-divider';
import GoogleAuthButton from '@/components/google-auth-button';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/lib/i18n';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    googleAuthEnabled: boolean;
    oauthError?: string;
};

export default function Login({ status, canResetPassword, googleAuthEnabled, oauthError }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Sign in')} />

            {oauthError && <InputError message={t(oauthError)} className="mb-4 text-center" />}

            {googleAuthEnabled && (
                <>
                    <GoogleAuthButton label={t('Sign in with Google')} />
                    <AuthDivider />
                </>
            )}

            <Form {...store.form()} resetOnSuccess={['password']} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('Email address')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    className="h-12 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-4 shadow-none focus:border-[#ee4d2d] focus:ring-[#ee4d2d]/20"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">{t('Password')}</Label>
                                    {canResetPassword && (
                                        <TextLink href={request()} className="ml-auto text-sm" tabIndex={5}>
                                            {t('Forgot password?')}
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder={t('Password')}
                                    className="h-12 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-4 shadow-none focus:border-[#ee4d2d] focus:ring-[#ee4d2d]/20"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox id="remember" name="remember" tabIndex={3} />
                                <Label htmlFor="remember">{t('Remember me')}</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-12 w-full rounded-xl bg-[#ee4d2d] font-bold text-white shadow-[0_14px_24px_-14px_rgba(238,77,45,0.85)] hover:bg-[#d83f22]"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {t('Sign in')}
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            {t("Don't have an account yet?")}{' '}
                            <TextLink href={register()} tabIndex={5}>
                                {t('Register')}
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{t(status)}</div>}
        </>
    );
}

Login.layout = {
    title: 'Sign in to your account',
    description: 'Use Google or your email',
};
