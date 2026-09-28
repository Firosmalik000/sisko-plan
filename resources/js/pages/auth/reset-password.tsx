import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/lib/i18n';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Reset password')} />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
            >
                {({ processing, errors }) => (
                    <div className="grid gap-2.5 sm:gap-3">
                        <div className="grid gap-1">
                            <Label htmlFor="email" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                {t('Email address')}
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs opacity-80 sm:h-10 sm:px-3.5 sm:text-xs"
                                readOnly
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="password" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                {t('Password')}
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                autoFocus
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
                                name="password_confirmation"
                                autoComplete="new-password"
                                placeholder={t('Confirm password')}
                                passwordrules={passwordRules}
                                className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        <Button
                            type="submit"
                            className="mt-0.5 h-9.5 w-full rounded-xl bg-[#ee4d2d] text-xs font-bold text-white shadow-md shadow-[#ee4d2d]/20 transition-all hover:bg-[#d83f22] active:scale-[0.99] sm:h-10"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            {t('Reset password')}
                        </Button>
                    </div>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Reset password',
    description: 'Please enter your new password below',
};
