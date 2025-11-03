# TODO: Add More Mock Leaderboard Data

## Tasks
- [x] Update sampleLeaderboard array in scripts/mock-leaderboard-server.js with 10-12 additional diverse entries
- [x] Update sampleLeaderboard array in scripts/mock-leaderboard-server.cjs with the same additional entries
- [x] Test the mock server by running it and verifying the leaderboard page displays the new data

## Notes
- Ensure ranks are sequential starting from 1
- Vary usernames, tournamentsWon, tournamentsPlayed, winRate, averageScore, totalPoints realistically
- Maintain the same structure as existing entries

## Completed
- Added 12 additional entries (total 27 entries now)
- Updated both .js and .cjs files
- Tested server startup and API response
- All entries have sequential ranks and realistic stats
