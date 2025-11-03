const http = require('http');

const sampleLeaderboard = [
  { rank: 1, userId: 'user1', username: 'MC Alpha', tournamentsWon: 12, tournamentsPlayed: 30, winRate: 40.0, averageScore: 87.5, totalPoints: 12345 },
  { rank: 2, userId: 'user2', username: 'BeatQueen', tournamentsWon: 10, tournamentsPlayed: 28, winRate: 35.7, averageScore: 82.3, totalPoints: 10234 },
  { rank: 3, userId: 'user3', username: 'Rhymesayer', tournamentsWon: 8, tournamentsPlayed: 25, winRate: 32.0, averageScore: 79.1, totalPoints: 9345 },
  { rank: 4, userId: 'user4', username: 'FlowMaster', tournamentsWon: 7, tournamentsPlayed: 22, winRate: 31.8, averageScore: 76.4, totalPoints: 8765 },
  { rank: 5, userId: 'user5', username: 'LyricLord', tournamentsWon: 6, tournamentsPlayed: 20, winRate: 30.0, averageScore: 74.2, totalPoints: 8123 },
  { rank: 6, userId: 'user6', username: 'RapWarrior', tournamentsWon: 5, tournamentsPlayed: 18, winRate: 27.8, averageScore: 71.8, totalPoints: 7456 },
  { rank: 7, userId: 'user7', username: 'BeatDropper', tournamentsWon: 4, tournamentsPlayed: 16, winRate: 25.0, averageScore: 69.5, totalPoints: 6789 },
  { rank: 8, userId: 'user8', username: 'MicDrop', tournamentsWon: 3, tournamentsPlayed: 14, winRate: 21.4, averageScore: 67.1, totalPoints: 6123 },
  { rank: 9, userId: 'user9', username: 'VerseViper', tournamentsWon: 2, tournamentsPlayed: 12, winRate: 16.7, averageScore: 64.8, totalPoints: 5456 },
  { rank: 10, userId: 'user10', username: 'RhymeRebel', tournamentsWon: 1, tournamentsPlayed: 10, winRate: 10.0, averageScore: 62.3, totalPoints: 4789 },
  { rank: 11, userId: 'user11', username: 'FlowFighter', tournamentsWon: 0, tournamentsPlayed: 8, winRate: 0.0, averageScore: 59.7, totalPoints: 4123 },
  { rank: 12, userId: 'user12', username: 'BeatBuilder', tournamentsWon: 0, tournamentsPlayed: 6, winRate: 0.0, averageScore: 57.2, totalPoints: 3456 },
  { rank: 13, userId: 'user13', username: 'LyricLancer', tournamentsWon: 0, tournamentsPlayed: 4, winRate: 0.0, averageScore: 54.8, totalPoints: 2789 },
  { rank: 14, userId: 'user14', username: 'RapRookie', tournamentsWon: 0, tournamentsPlayed: 2, winRate: 0.0, averageScore: 52.1, totalPoints: 2123 },
  { rank: 15, userId: 'user15', username: 'MicMaster', tournamentsWon: 0, tournamentsPlayed: 1, winRate: 0.0, averageScore: 49.5, totalPoints: 1456 },
  { rank: 16, userId: 'user16', username: 'Spitfire', tournamentsWon: 0, tournamentsPlayed: 3, winRate: 0.0, averageScore: 47.8, totalPoints: 1234 },
  { rank: 17, userId: 'user17', username: 'WordSmith', tournamentsWon: 1, tournamentsPlayed: 5, winRate: 20.0, averageScore: 46.2, totalPoints: 1123 },
  { rank: 18, userId: 'user18', username: 'BeatBender', tournamentsWon: 0, tournamentsPlayed: 7, winRate: 0.0, averageScore: 44.9, totalPoints: 1012 },
  { rank: 19, userId: 'user19', username: 'RhymeKing', tournamentsWon: 2, tournamentsPlayed: 9, winRate: 22.2, averageScore: 43.5, totalPoints: 987 },
  { rank: 20, userId: 'user20', username: 'FlowQueen', tournamentsWon: 0, tournamentsPlayed: 4, winRate: 0.0, averageScore: 42.1, totalPoints: 876 },
  { rank: 21, userId: 'user21', username: 'LyricStorm', tournamentsWon: 1, tournamentsPlayed: 6, winRate: 16.7, averageScore: 40.8, totalPoints: 765 },
  { rank: 22, userId: 'user22', username: 'MicMenace', tournamentsWon: 0, tournamentsPlayed: 2, winRate: 0.0, averageScore: 39.4, totalPoints: 654 },
  { rank: 23, userId: 'user23', username: 'VerseVortex', tournamentsWon: 3, tournamentsPlayed: 11, winRate: 27.3, averageScore: 38.0, totalPoints: 543 },
  { rank: 24, userId: 'user24', username: 'RapRevolution', tournamentsWon: 0, tournamentsPlayed: 8, winRate: 0.0, averageScore: 36.7, totalPoints: 432 },
  { rank: 25, userId: 'user25', username: 'BeatBaron', tournamentsWon: 1, tournamentsPlayed: 7, winRate: 14.3, averageScore: 35.3, totalPoints: 321 },
  { rank: 26, userId: 'user26', username: 'WordWarrior', tournamentsWon: 0, tournamentsPlayed: 5, winRate: 0.0, averageScore: 34.0, totalPoints: 210 },
  { rank: 27, userId: 'user27', username: 'FlowPhantom', tournamentsWon: 2, tournamentsPlayed: 10, winRate: 20.0, averageScore: 32.6, totalPoints: 99 },
];

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/tournaments/leaderboard') {
    const body = JSON.stringify(sampleLeaderboard);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    const body = JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

const port = process.env.MOCK_PORT || 5001;
server.listen(port, '127.0.0.1', () => {
  console.log(`Mock leaderboard server listening on http://127.0.0.1:${port}`);
});

// graceful shutdown
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
