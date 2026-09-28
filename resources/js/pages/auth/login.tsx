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

            <Form {...store.form()} resetOnSuccess={['password']} className="flex flex-col gap-2.5 sm:gap-3">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2.5 sm:gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="email" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
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
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                        {t('Password')}
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-[11px] font-medium text-[#ee4d2d] hover:underline"
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
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="size-3.5 rounded border-[#e8c8be] data-[state=checked]:border-[#ee4d2d] data-[state=checked]:bg-[#ee4d2d]"
                                />
                                <Label htmlFor="remember" className="cursor-pointer text-[11px] font-normal text-[#5a4843] sm:text-xs">
                                    {t('Remember me')}
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-0.5 h-9.5 w-full rounded-xl bg-[#ee4d2d] text-xs font-bold text-white shadow-md shadow-[#ee4d2d]/20 transition-all hover:bg-[#d83f22] active:scale-[0.99] sm:h-10"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {t('Sign in')}
                            </Button>
                        </div>

                        {googleAuthEnabled && (
                            <div className="flex flex-col gap-0.5">
                                <AuthDivider />
                                <GoogleAuthButton label={t('Sign in with Google')} />
                            </div>
                        )}

                        <div className="text-center text-[11px] text-[#765f59] sm:text-xs">
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
