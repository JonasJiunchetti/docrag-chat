<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): UserResource
    {
        $request->authenticate();
        $request->session()->regenerate();

        // Same value Sanctum's AuthenticateSession stores; without it a session that never
        // makes another request would survive a later password change.
        $guard = Auth::guard('web');
        $user = $guard->user();
        $request->session()->put(
            'password_hash_web',
            $guard->hashPasswordForCookie($user->getAuthPassword()),
        );

        return new UserResource($user);
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
