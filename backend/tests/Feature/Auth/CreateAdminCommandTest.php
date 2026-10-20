<?php

use App\Enums\UserRole;
use App\Models\User;

it('creates an active admin who can log in', function () {
    $this->artisan('user:create-admin')
        ->expectsQuestion('Name', 'Ada Admin')
        ->expectsQuestion('Email', 'Ada@Example.com')
        ->expectsQuestion('Password', 'a-long-enough-password')
        ->expectsQuestion('Confirm password', 'a-long-enough-password')
        ->assertSuccessful();

    $admin = User::firstWhere('email', 'ada@example.com');
    expect($admin->role)->toBe(UserRole::Admin)->and($admin->isActive())->toBeTrue();

    $this->postJson('/api/login', ['email' => 'ada@example.com', 'password' => 'a-long-enough-password'])
        ->assertOk()
        ->assertJsonPath('data.role', 'admin');
});

it('refuses an email that already exists', function () {
    User::factory()->create(['email' => 'ada@example.com']);

    $this->artisan('user:create-admin')
        ->expectsQuestion('Name', 'Ada Admin')
        ->expectsQuestion('Email', 'ADA@example.com')
        ->expectsQuestion('Password', 'a-long-enough-password')
        ->expectsQuestion('Confirm password', 'a-long-enough-password')
        ->assertFailed();

    expect(User::count())->toBe(1);
});

it('refuses a weak or unconfirmed password', function (string $password, string $confirmation) {
    $this->artisan('user:create-admin')
        ->expectsQuestion('Name', 'Ada Admin')
        ->expectsQuestion('Email', 'ada@example.com')
        ->expectsQuestion('Password', $password)
        ->expectsQuestion('Confirm password', $confirmation)
        ->assertFailed();

    expect(User::count())->toBe(0);
})->with([
    'too short' => ['short', 'short'],
    'mismatch' => ['a-long-enough-password', 'another-long-password'],
]);
