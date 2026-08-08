<?php

namespace App\Http\Controllers\Api;

use App\Events\PermitStatusChanged;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermitApprovalController extends Controller
{
    /**
     * تایید هوشمند پرمیت از طریق Signed URL / Bearer Token
     */
    public function approve(Request $request, string $id)
    {
        // در صورت عدم معتبر بودن Signed URL
        if (!$request->hasValidSignature() && !$request->bearerToken() && env('APP_ENV') === 'production') {
            return response()->json([
                'success' => false,
                'error' => 'لینک یا توکن امضا معتبر نیست یا منقضی شده است.'
            ], 401);
        }

        $user = $request->user();
        $role = $request->input('role', 'approver');
        $comment = $request->input('comment', 'تایید هوشمند از طریق لینک');

        // ثبت در جدول permit_approvals و ارتقای وضعیت پرمیت
        DB::beginTransaction();
        try {
            DB::table('permit_approvals')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'permit_id' => $id,
                'user_id' => $user?->id,
                'signer_name' => $user?->name ?? 'مسئول تایید کننده',
                'role' => $role,
                'status' => 'approved',
                'comment' => $comment,
                'signed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // تعیین وضعیت بعدی بر اساس روال (Supervisor -> HSE -> Area Owner -> Approved)
            $nextStatus = match ($role) {
                'supervisor' => 'pending_hse',
                'hse' => 'pending_area_owner',
                'area_owner' => 'approved',
                default => 'approved',
            };

            DB::table('permits')->where('id', $id)->update([
                'status' => $nextStatus,
                'updated_at' => now(),
            ]);

            DB::commit();

            // متصاعد کردن رویداد به n8n
            event(new PermitStatusChanged(['id' => $id], 'pending', $nextStatus, $user?->name ?? $role));

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'پرمیت با موفقیت تایید شد.',
                    'status' => $nextStatus,
                ]);
            }

            return response()->view('approvals.success', [
                'id' => $id,
                'role' => $role,
                'status' => $nextStatus
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * رد هوشمند پرمیت از طریق Signed URL / Bearer Token
     */
    public function reject(Request $request, string $id)
    {
        if (!$request->hasValidSignature() && !$request->bearerToken() && env('APP_ENV') === 'production') {
            return response()->json(['success' => false, 'error' => 'لینک یا توکن امضا نامعتبر است.'], 401);
        }

        $user = $request->user();
        $comment = $request->input('comment', 'رد شده توسط مسئول');

        DB::beginTransaction();
        try {
            DB::table('permit_approvals')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'permit_id' => $id,
                'user_id' => $user?->id,
                'signer_name' => $user?->name ?? 'مسئول تایید کننده',
                'role' => $request->input('role', 'approver'),
                'status' => 'rejected',
                'comment' => $comment,
                'signed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('permits')->where('id', $id)->update([
                'status' => 'rejected',
                'updated_at' => now(),
            ]);

            DB::commit();

            event(new PermitStatusChanged(['id' => $id], 'pending', 'rejected', $user?->name ?? 'Approver'));

            return response()->json([
                'success' => true,
                'message' => 'پرمیت رد شد و وضعیت آن به rejected تغییر یافت.',
                'status' => 'rejected'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
