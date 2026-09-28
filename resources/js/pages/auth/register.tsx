import { Form, Head } from '@inertiajs/react';
import AuthDivider from '@/components/auth-divider';
import GoogleAuthButton from '@/components/google-auth-button';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/lib/i18n';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
    googleAuthEnabled: boolean;
};

export default function Register({ passwordRules, googleAuthEnabled }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Register')} />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-2 sm:gap-2.5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2 sm:gap-2.5">
                            <div className="grid gap-1">
                                <Label htmlFor="name" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                    {t('Full name')}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder={t('Full name')}
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="email" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                    {t('Email address')}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="password" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                    {t('Password')}
                                </Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder={t('Password')}
                                    passwordrules={passwordRules}
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="password_confirmation" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                    {t('Confirm password')}
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder={t('Confirm password')}
                                    passwordrules={passwordRules}
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-0.5 h-9.5 w-full rounded-xl bg-[#ee4d2d] text-xs font-bold text-white shadow-md shadow-[#ee4d2d]/20 transition-all hover:bg-[#d83f22] active:scale-[0.99] sm:h-10"
                                tabIndex={5}
                                disabled={processing}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                {t('Create account')}
                            </Button>
                        </div>

                        {googleAuthEnabled && (
                            <div className="flex flex-col gap-0.5">
                                <AuthDivider />
                                <GoogleAuthButton label={t('Register with Google')} />
                            </div>
                        )}

                        <div className="text-center text-[11px] text-[#765f59] sm:text-xs">
                            {t('Already have an account?')}{' '}
                            <TextLink href={login()} className="font-semibold text-[#ee4d2d] hover:underline" tabIndex={6}>
                                {t('Sign in')}
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create your account',
    description: 'Use Google or your email',
};
