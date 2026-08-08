<?php

namespace App\Http\Controllers\Api;

use App\Events\PermitStatusChanged;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermitController extends Controller
{
    /**
     * ایجاد پرمیت جدید و متصاعد کردن رویداد اولیه به n8n
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'number' => 'required|string',
            'type' => 'required|string',
            'unit' => 'required|string',
            'location' => 'required|string',
            'description' => 'required|string',
            'supervisor_name' => 'required|string',
            'start_at' => 'required|date',
            'end_at' => 'required|date',
        ]);

        $permitId = (string) \Illuminate\Support\Str::uuid();
        $initialStatus = 'pending_supervisor';

        DB::table('permits')->insert([
            'id' => $permitId,
            'number' => $validated['number'],
            'type' => $validated['type'],
            'status' => $initialStatus,
            'unit' => $validated['unit'],
            'location' => $validated['location'],
            'description' => $validated['description'],
            'supervisor_name' => $validated['supervisor_name'],
            'start_at' => $validated['start_at'],
            'end_at' => $validated['end_at'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $permit = DB::table('permits')->where('id', $permitId)->first();

        // متصاعد کردن رویداد ایجاد جهت ارسال به n8n
        event(new PermitStatusChanged($permit, 'draft', $initialStatus, $validated['supervisor_name']));

        return response()->json([
            'success' => true,
            'message' => 'مجوز کار با موفقیت ایجاد گردید و به مرحله تایید سرپرست ارجاع داده شد.',
            'data' => $permit,
        ], 201);
    }

    /**
     * تغییر دستی یا به‌روزرسانی وضعیت پرمیت
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,pending_supervisor,pending_hse,pending_area_owner,approved,rejected,expired',
            'actor' => 'nullable|string',
        ]);

        $permit = DB::table('permits')->where('id', $id)->first();
        if (!$permit) {
            return response()->json(['success' => false, 'message' => 'پرمیت یافت نشد'], 404);
        }

        $prevStatus = $permit->status;
        $newStatus = $validated['status'];

        DB::table('permits')->where('id', $id)->update([
            'status' => $newStatus,
            'updated_at' => now(),
        ]);

        $updatedPermit = DB::table('permits')->where('id', $id)->first();

        // متصاعد کردن رویداد
        event(new PermitStatusChanged($updatedPermit, $prevStatus, $newStatus, $validated['actor'] ?? 'Admin'));

        return response()->json([
            'success' => true,
            'message' => 'وضعیت پرمیت به‌روزرسانی شد.',
            'status' => $newStatus,
        ]);
    }
}
