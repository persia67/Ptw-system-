<?php

use App\Http\Controllers\Api\PermitApprovalController;
use App\Http\Controllers\Api\PermitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - PTW Approval Workflow & n8n Integration
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // ایجاد پرمیت و لیست‌ها
    Route::post('/permits', [PermitController::class, 'store']);
    Route::patch('/permits/{id}/status', [PermitController::class, 'updateStatus']);

    // مسیرهای هوشمند تایید و رد با Signed URL / Bearer Token برای n8n و پیام‌رسان‌ها
    Route::match(['get', 'post'], '/permits/{id}/approve', [PermitApprovalController::class, 'approve'])
        ->name('api.v1.permits.approve');

    Route::match(['get', 'post'], '/permits/{id}/reject', [PermitApprovalController::class, 'reject'])
        ->name('api.v1.permits.reject');
});
