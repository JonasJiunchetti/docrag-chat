<?php

namespace App\Http\Requests;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to log the user in. Unknown email, wrong password and a
     * deactivated account all fail with the same message.
     *
     * @throws ValidationException
     * @throws ThrottleRequestsException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $attempted = Auth::guard('web')->attempt([
            'email' => Str::lower($this->string('email')->toString()),
            'password' => $this->string('password')->toString(),
            fn (Builder $query) => $query->whereNull('deactivated_at'),
        ]);

        if (! $attempted) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        throw new ThrottleRequestsException(
            trans('auth.throttle', [
                'seconds' => RateLimiter::availableIn($this->throttleKey()),
                'minutes' => 1,
            ]),
            headers: ['Retry-After' => RateLimiter::availableIn($this->throttleKey())],
        );
    }

    private function throttleKey(): string
    {
        return Str::lower($this->string('email')->toString()).'|'.$this->ip();
    }
}
