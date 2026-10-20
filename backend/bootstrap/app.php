<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Same-origin SPA + API (docs/foundations.md §7.1): no CORS.
        $middleware->remove(HandleCors::class);
        // Sanctum stateful SPA cookies (docs/foundations.md Part B "Authentication").
        $middleware->statefulApi();
        // Guests are never redirected: there is no server-side login page, the SPA owns it.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // /api always answers JSON, even without an Accept header (no redirect to a login route).
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
