<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PermitStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public mixed $permit;
    public string $previousStatus;
    public string $newStatus;
    public string $actor;

    /**
     * رویداد تغییر وضعیت پرمیت PTW
     */
    public function __construct(mixed $permit, string $previousStatus, string $newStatus, string $actor = 'System')
    {
        $this->permit = $permit;
        $this->previousStatus = $previousStatus;
        $this->newStatus = $newStatus;
        $this->actor = $actor;
    }
}
