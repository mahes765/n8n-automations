<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class N8nController extends Controller
{
    public function telegram(): Response
    {
        return response('Access granted to Telegram Bot');
    }

    public function form(): Response
    {
        return response('Access granted to Form');
    }
}
