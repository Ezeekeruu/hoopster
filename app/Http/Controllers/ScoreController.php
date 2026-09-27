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

    public function create()
    {
        return view('scores.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'player_name' => 'required|string|max:255',
            'level_reached' => 'required|integer|min:1',
            'total_score' => 'required|integer|min:0',
        ]);

        Score::create($validated);

        return redirect()->route('scores.index')->with('success', 'Score saved!');
    }

    public function show(Score $score)
    {
        return view('scores.show', compact('score'));
    }

    public function edit(Score $score)
    {
        return view('scores.edit', compact('score'));
    }

    public function update(Request $request, Score $score)
    {
        $validated = $request->validate([
            'player_name' => 'required|string|max:255',
            'level_reached' => 'required|integer|min:1',
            'total_score' => 'required|integer|min:0',
        ]);

        $score->update($validated);

        return redirect()->route('scores.index')->with('success', 'Score updated!');
    }

    public function destroy(Score $score)
    {
        $score->delete();

        return redirect()->route('scores.index')->with('success', 'Score deleted!');
    }
}