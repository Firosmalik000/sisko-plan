<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\EmailVerificationNotificationSentResponse as EmailVerificationNotificationSentResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class EmailVerificationNotificationSentResponse implements EmailVerificationNotificationSentResponseContract
{
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 202);
        }

        return to_route('verification.notice')->with('status', Fortify::VERIFICATION_LINK_SENT);
    }
}
