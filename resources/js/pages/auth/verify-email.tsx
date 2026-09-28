// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/lib/i18n';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Email verification')} />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {t('A new verification link has been sent to the email address you used to register.')}
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button
                            disabled={processing}
                            className="h-11 w-full rounded-xl bg-[#ee4d2d] text-xs font-bold text-white shadow-md shadow-[#ee4d2d]/20 transition-all hover:bg-[#d83f22] active:scale-[0.99] sm:h-12 sm:text-sm"
                        >
                            {processing && <Spinner />}
                            {t('Resend verification email')}
                        </Button>

                        <TextLink href={logout()} className="mx-auto block text-xs font-semibold text-[#ee4d2d] hover:underline sm:text-sm">
                            {t('Sign out')}
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description: 'Please verify your email address by clicking on the link we just emailed to you.',
};
