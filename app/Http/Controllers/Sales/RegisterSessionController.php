<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Registers\CloseRegisterSession;
use App\Actions\Registers\OpenRegisterSession;
use App\Actions\Registers\PostDrawerMovement;
use App\Http\Controllers\Controller;
use App\Http\Requests\Registers\CloseRegisterSessionRequest;
use App\Http\Requests\Registers\OpenRegisterSessionRequest;
use App\Http\Requests\Registers\PostDrawerMovementRequest;
use App\Models\BusinessMembership;
use App\Models\PosActionApproval;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Support\CurrentPosDevice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class RegisterSessionController extends Controller
{
    public function store(OpenRegisterSessionRequest $request, CurrentPosDevice $device, OpenRegisterSession $action): RedirectResponse
    {
        $register = Register::query()->where([
            'public_id' => $request->validated('register_id'),
            'store_id' => $device->get()->store_id,
        ])->firstOrFail();
        $session = $action->handle($register, $this->actor($request), $request->validated('opening_cash'), $device->get());
        $request->session()->put('register_session_id', $session->id);

        return to_route('terminal.home');
    }

    public function close(CloseRegisterSessionRequest $request, RegisterSession $registerSession, CurrentPosDevice $device, CloseRegisterSession $action): RedirectResponse
    {
        abort_unless($registerSession->store_id === $device->get()->store_id, 404);
        $closed = $action->handle($registerSession, $this->actor($request), $request->validated('counted_cash'));
        if ((int) $request->session()->get('register_session_id') === $closed->id) {
            $request->session()->forget('register_session_id');
        }

        return to_route('terminal.home');
    }

    public function movement(PostDrawerMovementRequest $request, RegisterSession $registerSession, CurrentPosDevice $device, PostDrawerMovement $action): RedirectResponse
    {
        abort_unless($registerSession->store_id === $device->get()->store_id, 404);
        $approval = filled($request->validated('approval_id'))
            ? PosActionApproval::query()->where('public_id', $request->validated('approval_id'))->firstOrFail()
            : null;
        $action->handle($registerSession, $this->actor($request), $request->validated('direction'), $request->validated('amount'), $request->validated('reason'), $approval);

        return back();
    }

    private function actor(Request $request): BusinessMembership
    {
        $actor = $request->attributes->get('pos_actor');
        abort_unless($actor instanceof BusinessMembership, 403);

        return $actor;
    }
}
