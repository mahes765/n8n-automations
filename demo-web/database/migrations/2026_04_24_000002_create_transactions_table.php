<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans')->cascadeOnDelete();
            $table->string('midtrans_order_id')->unique();
            $table->enum('status', ['pending', 'paid', 'failed', 'expired'])->default('pending');
            $table->unsignedInteger('gross_amount');
            $table->string('payment_type')->nullable();
            $table->dateTime('settlement_time')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
