<?php

use App\Models\User;

it('ends the session on logout', function () {
    $user = User::factory()->create();
    $login = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

    $session = $this->withSessionFrom($login);
    $logout = $session->postJson('/api/logout')->assertNoContent();

    // Replaying the old session cookie is no longer authenticated.
    $this->app['auth']->forgetGuards();
    $this->withSessionFrom($login)->getJson('/api/me')->assertUnauthorized();
});

it('returns 401 json for guests on the current-user route', function () {
    $this->getJson('/api/me')->assertUnauthorized()->assertJsonPath('message', 'Unauthenticated.');
});

it('returns 401 json instead of a redirect without an Accept header', function () {
    $this->withHeaders(['Accept' => ''])
        ->get('/api/me')
        ->assertUnauthorized()
        ->assertHeader('Content-Type', 'application/json');
});

it('keeps only the public routes open to guests', function () {
    $this->getJson('/api/ping')->assertOk();
    $this->get('/api/sanctum/csrf-cookie')->assertNoContent();

    $this->postJson('/api/logout')->assertUnauthorized();
    $this->putJson('/api/me/password', [])->assertUnauthorized();
});

it('rejects a user who was deactivated after logging in', function () {
    $user = User::factory()->create();
    $login = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

    $user->forceFill(['deactivated_at' => now()])->save();

    $this->withSessionFrom($login)->getJson('/api/me')->assertUnauthorized();
});
