<?php

it('answers the api ping route', function () {
    $this->getJson('/api/ping')
        ->assertOk()
        ->assertExactJson(['status' => 'ok']);
});

it('answers the framework health route', function () {
    $this->get('/up')->assertOk();
});
