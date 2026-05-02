<?php

namespace App\Http\Controllers;

use App\Services\TelegramLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramLinkController extends Controller
{
    public function store(Request $request, TelegramLinkService $telegramLinkService): JsonResponse
    {
        $validated = $request->validate([
            'telegram_id' => ['required', 'string', 'regex:/^[0-9]+$/'],
            'link_token' => ['required', 'string', 'max:64'],
        ]);

        $result = $telegramLinkService->link(
            $validated['telegram_id'],
            $validated['link_token'],
        );

        return response()->json($result, $result['linked'] ? 200 : 422);
    }
}
