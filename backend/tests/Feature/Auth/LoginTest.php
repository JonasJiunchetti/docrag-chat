<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;

function loginPayload(User $user, string $password = 'password'): array
{
    return ['email' => $user->email, 'password' => $password];
}

it('serves the csrf cookie under /api', function () {
    $this->get('/api/sanctum/csrf-cookie')
        ->assertNoContent()
        ->assertCookie('XSRF-TOKEN');
});

it('logs in an active user and returns their profile', function () {
    $user = User::factory()->create();

    $login = $this->postJson('/api/login', loginPayload($user))
        ->assertOk()
        ->assertExactJson(['data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'employee',
        ]]);

    $this->withSessionFrom($login)
        ->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);
});

it('matches the email regardless of case', function () {
    $user = User::factory()->create(['email' => 'ana@example.com']);

    $this->postJson('/api/login', ['email' => 'ANA@Example.com', 'password' => 'password'])
        ->assertOk();
});

it('never exposes password fields', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', loginPayload($user))
        ->assertJsonMissingPath('data.password')
        ->assertJsonMissingPath('data.remember_token');
});

it('rejects wrong password, unknown email and deactivated account with the same error', function () {
    $active = User::factory()->create();
    $deactivated = User::factory()->deactivated()->create();

    $responses = [
        $this->postJson('/api/login', loginPayload($active, 'wrong-password')),
        $this->postJson('/api/login', ['email' => 'nobody@example.com', 'password' => 'password']),
        $this->postJson('/api/login', loginPayload($deactivated)),
    ];

    foreach ($responses as $response) {
        $response->assertUnprocessable()
            ->assertJsonPath('errors.email.0', trans('auth.failed'));
    }
});

it('validates the login fields', function () {
    $this->postJson('/api/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});

it('throttles after five failed attempts and recovers after a success is possible', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/login', loginPayload($user, 'wrong-password'))->assertUnprocessable();
    }

    $this->postJson('/api/login', loginPayload($user, 'wrong-password'))->assertStatus(429);
    $this->postJson('/api/login', loginPayload($user))->assertStatus(429);

    RateLimiter::clear(strtolower($user->email).'|127.0.0.1');

    $this->postJson('/api/login', loginPayload($user))->assertOk();
});

it('clears the failed-attempt counter after a successful login', function () {
    $user = User::factory()->create();

    foreach (range(1, 4) as $_) {
        $this->postJson('/api/login', loginPayload($user, 'wrong-password'))->assertUnprocessable();
    }
    $this->postJson('/api/login', loginPayload($user))->assertOk();

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/login', loginPayload($user, 'wrong-password'))->assertUnprocessable();
    }
});
