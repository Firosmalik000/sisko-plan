<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TranslateValidationExceptions
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (ValidationException $exception) {
            $translated = [];

            foreach ($exception->errors() as $field => $messages) {
                $translated[$field] = array_map(
                    static fn (string $message): string => __($message),
                    $messages,
                );
            }

            $localized = ValidationException::withMessages($translated);
            $localized->status = $exception->status;
            $localized->errorBag = $exception->errorBag;
            $localized->redirectTo = $exception->redirectTo;

            throw $localized;
        }
    }
}
