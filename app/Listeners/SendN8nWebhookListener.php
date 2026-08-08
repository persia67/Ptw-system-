<?php

namespace App\Listeners;

use App\Events\PermitStatusChanged;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class SendN8nWebhookListener implements ShouldQueue
{
    /**
     * ارسال داده‌های کامل پرمیت به وب‌هوک n8n پس از تغییر وضعیت
     */
    public function handle(PermitStatusChanged $event): void
    {
        $webhookUrl = config('services.n8n.webhook_url') ?: env('N8N_WEBHOOK_URL');

        if (!$webhookUrl) {
            Log::warning('N8N_WEBHOOK_URL is not configured in .env file.');
            return;
        }

        $permit = $event->permit;

        // ساخت لینک‌های امضای ۱-کلیکی هوشمند (Signed URLs)
        $approveUrl = URL::signedRoute('api.v1.permits.approve', [
            'id' => $permit->id ?? $permit['id'],
            'role' => $permit->current_role ?? 'approver'
        ]);

        $rejectUrl = URL::signedRoute('api.v1.permits.reject', [
            'id' => $permit->id ?? $permit['id'],
            'role' => $permit->current_role ?? 'approver'
        ]);

        $payload = [
            'event' => 'PermitStatusChanged',
            'permit_id' => $permit->id ?? $permit['id'],
            'number' => $permit->number ?? $permit['number'],
            'title' => $permit->description ?? $permit['description'] ?? 'مجوز کار PTW',
            'issuer' => $permit->supervisor_name ?? $permit['supervisorName'] ?? 'صادرکننده',
            'unit' => $permit->unit ?? $permit['unit'] ?? 'نامشخص',
            'location' => $permit->location ?? $permit['location'] ?? 'نامشخص',
            'risk_level' => $permit->risk_level ?? 'متوسط (Medium)',
            'previous_status' => $event->previousStatus,
            'status' => $event->newStatus,
            'actor' => $event->actor,
            'approval_url' => $approveUrl,
            'rejection_url' => $rejectUrl,
            'timestamp' => now()->toIso8601String(),
        ];

        try {
            $response = Http::withHeaders([
                'X-PTW-Event' => 'PermitStatusChanged',
                'X-N8N-API-Key' => env('N8N_API_KEY', '')
            ])->post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("Webhook successfully dispatched to n8n for Permit {$payload['number']}");
            } else {
                Log::error("n8n Webhook failed with status {$response->status()}: " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("Failed to connect to n8n webhook: " . $e->getMessage());
        }
    }
}
