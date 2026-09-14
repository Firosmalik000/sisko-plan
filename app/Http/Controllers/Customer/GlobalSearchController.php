<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\GlobalSearchRequest;
use App\Services\Customer\GlobalSearch;
use Illuminate\Http\JsonResponse;

class GlobalSearchController extends Controller
{
    public function __invoke(GlobalSearchRequest $request, GlobalSearch $search): JsonResponse
    {
        return response()->json([
            'groups' => $search->find(trim($request->validated('q'))),
        ]);
    }
}
