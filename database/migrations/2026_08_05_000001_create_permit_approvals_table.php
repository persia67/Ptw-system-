<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * جدول تاریخچه امضاها و تاییدهای مراحل مختلف پرمیت (Permit Approvals)
     */
    public function up(): void
    {
        Schema::create('permit_approvals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('permit_id')->constrained('permits')->onDelete('cascade');
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('signer_name');
            $table->string('role'); // e.g. supervisor, hse, area_owner
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('comment')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->string('token')->nullable(); // Signed URL token for 1-click approvals
            $table->string('verification_hash')->nullable(); // SHA-256 digital signature
            $table->timestamps();

            $table->index(['permit_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_approvals');
    }
};
