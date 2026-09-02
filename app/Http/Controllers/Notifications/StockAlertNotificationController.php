<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Notifications\StockAlertNotifications;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class StockAlertNotificationController extends Controller
{
    public function read(
        Request $request,
        CurrentStore $currentStore,
        StockAlertNotifications $notifications,
    ): RedirectResponse {
        $store = $currentStore->get();
        Gate::authorize('viewOperations', $store);

        /** @var User $user */
        $user = $request->user();
        $notifications->markCurrentAsRead($user, $store);

        return back();
    }
}
