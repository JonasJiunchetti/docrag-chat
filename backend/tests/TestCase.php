<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum only starts a session for requests that come from the SPA's origin.
        $this->withHeaders([
            'Referer' => 'http://localhost:8080/',
            'Accept' => 'application/json',
        ]);
    }

    /**
     * Carry the session cookie from a response into the following requests,
     * the way a browser would.
     */
    protected function withSessionFrom(TestResponse $response): static
    {
        $name = config('session.cookie');
        $cookie = $response->getCookie($name);

        // The array session store is shared across requests inside one test, unlike a real browser.
        $this->app['auth']->forgetGuards();
        $this->flushSession();

        // JSON requests only carry cookies when credentials are enabled.
        return $this->withCredentials()->withCookie($name, $cookie->getValue());
    }
}
