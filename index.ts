import express from 'express';
import cors from 'cors';
import { PORT, IP } from './src/utils/constants';
import { newGame, playerList, currentGame, currentToExecuteValidator, avalibleActions, playerAction, winnerSelect } from './src/controllers/gameController';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/newGame', newGame);

app.post('/api/:gameId/playerList', playerList);

app.get('/api/:gameId/currentGame', currentGame);

app.get('/api/:gameId/currentToExecuteValidator', currentToExecuteValidator);

app.get('/api/:gameId/avalibleActions', avalibleActions);

app.post('/api/:gameId/playerAction', playerAction);

app.post('/api/:gameId/winnerSelect', winnerSelect);

app.listen(PORT, IP);