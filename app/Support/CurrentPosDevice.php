<?php

namespace App\Support;

use App\Models\PosDevice;
use LogicException;

class CurrentPosDevice
{
    private ?PosDevice $device = null;

    public function set(PosDevice $device): void
    {
        $this->device = $device;
    }

    public function get(): PosDevice
    {
        return $this->device ?? throw new LogicException('No active POS device is available.');
    }
}
