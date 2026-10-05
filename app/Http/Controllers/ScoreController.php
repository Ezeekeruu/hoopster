<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\Request;

class ScoreController extends Controller
{
    public function index()
    {
        $scores = Score::orderByDesc('total_score')
            ->take(10)
            ->get(['player_name', 'level_reached', 'total_score']);

        return response()->json($scores);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'player_name' => 'required|string|max:20',
            'level_reached' => 'required|integer|min:1|max:10',
            'total_score' => 'required|integer|min:0|max:1000',
        ]);

        $score = Score::create($validated);

        if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json($score, 201);
        }

        return redirect()->route('scores.index')->with('success', 'Score saved!');
    }
}