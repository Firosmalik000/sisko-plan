<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LogoutResponse implements LogoutResponseContract
{
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return response()->noContent();
        }

        return to_route('login');
    }
}
