import { Request, Response } from 'express';
import { Game } from '../models/gameStages';
import { Player } from '../models/chipHolders';
import { ActionType, toExecuteValidatorType, HandStageValidationType, BettingStageValidationType, TurnValidationType } from "../utils/constants";
import { v4 as uuidv4 } from 'uuid';

export const games: { [key: string]: Game } = {};
export let game: Game | null = null;

export const newGame = (req: Request, res: Response) => {
    const gameId = uuidv4(); // Generar un ID único para el juego
    const newGame = new Game();
    const bigBlindValue = parseInt(req.body.bigBlindValue);

    newGame.handStage.defineBlindsValues(bigBlindValue);
    games[gameId] = newGame;
    
    res.status(201).json({ message: 'Game created successfully', gameId });
};

export const playerList = (req: Request, res: Response) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        res.status(404).json({ message: 'No active game found.' });
    }

    const game = games[gameId];
    const playerReq = req.body;
    const playerList: Player[] = [];

    for (let player of playerReq) {
        const newPlayer = new Player(player.id, player.chips);
        playerList.push(newPlayer);
    };

    if (!Array.isArray(playerReq) || playerReq.length <= 1) {
        res.status(400).json({ message: 'Invalid player list' });
        return;
    };

    game.playerManager.playerList = playerList;
    game.positionManager.initializePositions(game, -1);

    res.status(200).json({ message: 'Player list received successfully', playerList: game?.playerManager.playerList });
};

export const currentGame = (req: Request, res: Response) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        res.status(404).json({ message: 'No active game found.' });
    }

    const game = games[gameId];
    const updatedGame = game.toJSON();
    res.status(200).json(updatedGame);
};

export const currentToExecuteValidator = (req: Request, res: Response) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        res.status(404).json({ message: 'No active game found.' });
    }

    const game = games[gameId];

    try {
        switch (game.toExecuteValidator) {
            case toExecuteValidatorType.GameOver:
                break
                
            case toExecuteValidatorType.HandStageValidator:
                const handStageValidation: HandStageValidationType = game.handStageValidator.validate(game);
                if (handStageValidation === HandStageValidationType.EndGame) {
                    game.toExecuteValidator = game.handStageValidator.endGame(game);
                } else if (handStageValidation === HandStageValidationType.StartHandStage) {
                    game.toExecuteValidator = game.handStageValidator.startHandStage(game);
                }
                break

            case toExecuteValidatorType.BettingStageValidator:
                const bettingStageValidation: BettingStageValidationType = game.bettingStageValidator.validate(game);if (bettingStageValidation === BettingStageValidationType.EndHandStage) {
                    game.toExecuteValidator = game.bettingStageValidator.endHand(game);
                } else if (bettingStageValidation === BettingStageValidationType.StartBettingStage) {
                    game.toExecuteValidator = game.bettingStageValidator.startBettingStage(game);
                }
                break

            case toExecuteValidatorType.TurnValidator:
                const turnValidation: TurnValidationType = game.turnValidator.validate(game);
                if (turnValidation === TurnValidationType.EndBettingStage) {
                    game.toExecuteValidator = game.turnValidator.endBettingStage(game);
                } else if (turnValidation === TurnValidationType.NextPlayer) {
                    game.toExecuteValidator = game.turnValidator.nextPlayer(game);
                } else if (turnValidation === TurnValidationType.GiveActions) {
                    game.toExecuteValidator = game.turnValidator.giveActions(game);
                }
                break

            default:
                throw new Error('Unexpected validator type.');
        };

        res.status(200).json(game.toExecuteValidator);
    } catch (error) {
        console.error('Error processing toExecuteValidation:', error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        } else {
            res.status(500).json({ message: 'Internal server error', error: 'Unknowd error.' });
        };
    };
};

export const avalibleActions = (req: Request, res: Response) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        res.status(404).json({ message: 'No active game found.' });
    }

    const game = games[gameId];

    try {
        const avalibleActions = game.actionSelector.getOptions(game);
        res.status(200).json(avalibleActions);
    } catch (error) {
        console.error('Error processing avalibleActionsValidation:', error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Internal server error', error: error.message });
        } else {
            res.status(500).json({ message: 'Internal server error', error: 'Unknowd error.' });
        };
    };
};

export const playerAction = (req: Request, res: Response) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        res.status(404).json({ message: 'No active game found.' });
    }

    const game = games[gameId];
    const { action, amount } = req.body;
    const playerActions = game.playerActions;

    switch (action) {
        case ActionType.Bet:
            playerActions.bet(game, amount);
            break;
        case ActionType.Call:
            playerActions.call(game);
            break;
        case ActionType.Check:
            playerActions.check(game);
            break;
        case ActionType.CheckBigBlind:
            playerActions.checkBigBlind(game);
            break;
        case ActionType.Fold:
            playerActions.fold(game);
            break;
        case ActionType.MustAllIn:
            playerActions.mustAllIn(game);
            break;
        case ActionType.PutBigBlind:
            playerActions.putBigBlind(game);
            break;
        case ActionType.PutSmallBlind:
            playerActions.putSmallBlind(game);
            break;
        case ActionType.Raise:
            playerActions.raise(game, amount);
            break;
        case ActionType.RaiseAllIn:
            playerActions.raiseAllIn(game);
            break;
        default:
            res.status(400).json({ message: 'Invalid action specified.' });
            return;
    };

    game.toExecuteValidator = toExecuteValidatorType.TurnValidator;
    res.status(200).json({ updatedGame: game });
};

export const winnerSelect = (req: Request, res: Response) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        res.status(404).json({ message: 'No active game found.' });
    }

    const game = games[gameId];
    const winnerListPerPot = req.body.winnerListPerPot;
    const potManager = game.potManager;
    const potList = game.potManager.potList;
    const playerManager = game.playerManager;
    const positionManager = game.positionManager;

    for (let i in potList) {
        potList[i].activePlayerIds = winnerListPerPot[i];
        potList[i].defineWinners(game);
        potList[i].payWinners(game);
    };

    potManager.resetPotList();
    playerManager.resetIsPlaying();
    positionManager.updateNextHand(game);
    game.toExecuteValidator = toExecuteValidatorType.HandStageValidator;

    res.status(200).json({ updatedGame: game });
};