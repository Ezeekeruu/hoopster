<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameController;
use App\Http\Controllers\ScoreController;


Route::get('/', [GameController::class, 'index'])->name('game.index');

Route::get('scores', [ScoreController::class, 'index'])->name('scores.index');
Route::post('scores', [ScoreController::class, 'store'])->middleware('throttle:10,1')->name('scores.store');