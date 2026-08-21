<?php

namespace App\Console\Commands;

use App\Enums\PlatformAdminRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreatePlatformAdmin extends Command
{
    protected $signature = 'platform-admin:create {--name=} {--email=}';

    protected $description = 'Create an active platform Super Admin account';

    public function handle(): int
    {
        $name = (string) ($this->option('name') ?: $this->ask('Nama Super Admin'));
        $email = (string) ($this->option('email') ?: $this->ask('Email Super Admin'));
        $password = (string) $this->secret('Kata sandi');

        $validator = Validator::make(compact('name', 'email', 'password'), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'platform_role' => PlatformAdminRole::SuperAdmin,
            'status' => UserStatus::Active,
        ]);

        $this->info('Super Admin berhasil dibuat.');

        return self::SUCCESS;
    }
}
