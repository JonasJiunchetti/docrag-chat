<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePasswordRequest;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class PasswordController extends Controller
{
    public function update(UpdatePasswordRequest $request): Response
    {
        $password = $request->string('password')->toString();

        $request->user()->update(['password' => $password]);

        // Ends the user's other sessions; this one stays logged in.
        Auth::guard('web')->logoutOtherDevices($password);

        return response()->noContent();
    }
}
