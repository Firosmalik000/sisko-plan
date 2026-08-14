<?php

namespace App\Console\Commands;

use App\Models\PlatformAdmin;
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
            'email' => ['required', 'email', 'max:255', 'unique:platform_admins,email'],
            'password' => ['required', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        PlatformAdmin::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'is_active' => true,
        ]);

        $this->info('Super Admin berhasil dibuat.');

        return self::SUCCESS;
    }
}
