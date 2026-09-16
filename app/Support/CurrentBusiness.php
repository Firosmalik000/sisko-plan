<?php

namespace App\Support;

use App\Models\Business;
use App\Models\BusinessMembership;
use LogicException;

class CurrentBusiness
{
    private ?Business $business = null;

    private ?BusinessMembership $membership = null;

    public function set(Business $business, BusinessMembership $membership): void
    {
        $this->business = $business;
        $this->membership = $membership;
    }

    public function get(): Business
    {
        return $this->business ?? throw new LogicException('No active business has been resolved.');
    }

    public function membership(): BusinessMembership
    {
        return $this->membership ?? throw new LogicException('No active business membership has been resolved.');
    }

    public function id(): int
    {
        return $this->get()->id;
    }

    public function hasBusiness(): bool
    {
        return $this->business !== null;
    }
}
