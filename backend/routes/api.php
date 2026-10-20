<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordController;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json(['status' => 'ok']));

Route::post('/login', [AuthController::class, 'login']);

// Everything else requires a login (docs/foundations.md Part B "Authentication").
// New routes belong inside this group.
Route::middleware(['auth:sanctum', EnsureUserIsActive::class])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/password', [PasswordController::class, 'update']);
});
