<?php

use App\Models\User;

function passwordPayload(array $overrides = []): array
{
    return array_merge([
        'current_password' => 'password',
        'password' => 'a-brand-new-password',
        'password_confirmation' => 'a-brand-new-password',
    ], $overrides);
}

it('changes the password, keeping this session and ending the others', function () {
    $user = User::factory()->create();
    $credentials = ['email' => $user->email, 'password' => 'password'];

    $current = $this->postJson('/api/login', $credentials)->assertOk();
    $this->app['auth']->forgetGuards();
    $other = $this->flushSession()->postJson('/api/login', $credentials)->assertOk();

    $this->withSessionFrom($current)->putJson('/api/me/password', passwordPayload())->assertNoContent();

    $this->withSessionFrom($current)->getJson('/api/me')->assertOk();
    $this->withSessionFrom($other)->getJson('/api/me')->assertUnauthorized();

    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertUnprocessable();
    $this->postJson('/api/login', ['email' => $user->email, 'password' => 'a-brand-new-password'])->assertOk();
});

it('rejects a wrong current password', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->putJson('/api/me/password', passwordPayload(['current_password' => 'nope']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

it('rejects short or unconfirmed new passwords', function (array $overrides, string $field) {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->putJson('/api/me/password', passwordPayload($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
})->with([
    'too short' => [['password' => 'short', 'password_confirmation' => 'short'], 'password'],
    'not confirmed' => [['password_confirmation' => 'different-password-1'], 'password'],
]);
