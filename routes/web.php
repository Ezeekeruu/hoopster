<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameController;
use App\Http\Controllers\ScoreController;


Route::get('/', [GameController::class, 'index'])->name('game.index');

Route::resource('scores', ScoreController::class);