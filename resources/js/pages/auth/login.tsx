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

            <Form {...store.form()} resetOnSuccess={['password']} className="flex flex-col gap-3.5 sm:gap-4">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-3.5 sm:gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold text-[#3b211b] sm:text-sm">
                                    {t('Email address')}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    className="h-11 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3.5 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-12 sm:px-4 sm:text-sm"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-xs font-semibold text-[#3b211b] sm:text-sm">
                                        {t('Password')}
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-medium text-[#ee4d2d] hover:underline"
                                            tabIndex={5}
                                        >
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
                                    className="h-11 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3.5 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-12 sm:px-4 sm:text-sm"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2 pt-0.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="rounded-md border-[#e8c8be] data-[state=checked]:border-[#ee4d2d] data-[state=checked]:bg-[#ee4d2d]"
                                />
                                <Label htmlFor="remember" className="cursor-pointer text-xs font-normal text-[#5a4843] sm:text-sm">
                                    {t('Remember me')}
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 h-11 w-full rounded-xl bg-[#ee4d2d] text-xs font-bold text-white shadow-md shadow-[#ee4d2d]/20 transition-all hover:bg-[#d83f22] active:scale-[0.99] sm:h-12 sm:text-sm"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {t('Sign in')}
                            </Button>
                        </div>

                        {googleAuthEnabled && (
                            <div className="flex flex-col gap-1">
                                <AuthDivider />
                                <GoogleAuthButton label={t('Sign in with Google')} />
                            </div>
                        )}

                        <div className="mt-1 text-center text-xs text-[#765f59] sm:text-sm">
                            {t("Don't have an account yet?")}{' '}
                            <TextLink href={register()} className="font-semibold text-[#ee4d2d] hover:underline" tabIndex={5}>
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
