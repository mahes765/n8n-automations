<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class N8nController extends Controller
{
    public function telegram(): JsonResponse
    {
        return response()->json([
            'message' => 'Access granted to Telegram Bot',
        ]);
    }

    public function form(): JsonResponse
    {
        return response()->json([
            'message' => 'Access granted to Web Form',
        ]);
    }
}
