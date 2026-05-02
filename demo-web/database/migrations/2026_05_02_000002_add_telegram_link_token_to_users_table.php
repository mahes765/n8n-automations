<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('telegram_link_token', 64)->nullable()->unique()->after('telegram_id');
            $table->dateTime('telegram_link_token_expires_at')->nullable()->after('telegram_link_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['telegram_link_token']);
            $table->dropColumn(['telegram_link_token', 'telegram_link_token_expires_at']);
        });
    }
};
