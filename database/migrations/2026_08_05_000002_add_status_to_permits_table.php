<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * افزودن فیلد status استاندارد گردش کار به جدول اصلی پرمیت‌ها
     */
    public function up(): void
    {
        Schema::table('permits', function (Blueprint $table) {
            if (!Schema::hasColumn('permits', 'status')) {
                $table->enum('status', [
                    'draft',
                    'pending_supervisor',
                    'pending_hse',
                    'pending_area_owner',
                    'approved',
                    'rejected',
                    'expired',
                    'active',
                    'suspended',
                    'closed'
                ])->default('draft')->after('number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('permits', function (Blueprint $table) {
            if (Schema::hasColumn('permits', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
