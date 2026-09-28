// Components
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Forgot password')} />

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{t(status)}</div>}

            <div className="space-y-3">
                <Form {...email.form()}>
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-1">
                                <Label htmlFor="email" className="text-[11px] font-semibold text-[#3b211b] sm:text-xs">
                                    {t('Email address')}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder="email@example.com"
                                    className="h-9.5 rounded-xl border-[#e8c8be] bg-[#fffdfc] px-3 text-xs shadow-none transition-all placeholder:text-[#a89088] focus:border-[#ee4d2d] focus:ring-2 focus:ring-[#ee4d2d]/20 sm:h-10 sm:px-3.5 sm:text-xs"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="pt-1">
                                <Button
                                    className="h-9.5 w-full rounded-xl bg-[#ee4d2d] text-xs font-bold text-white shadow-md shadow-[#ee4d2d]/20 transition-all hover:bg-[#d83f22] active:scale-[0.99] sm:h-10"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    {t('Send password reset link')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="space-x-1 text-center text-xs text-[#765f59] sm:text-sm">
                    <span>{t('Or return to')}</span>
                    <TextLink href={login()} className="font-semibold text-[#ee4d2d] hover:underline">
                        {t('sign in')}
                    </TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};
