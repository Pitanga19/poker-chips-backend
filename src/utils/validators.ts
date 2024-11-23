import { Game } from "../models/gameStages";
import { HandStageValidationType, BettingStageValidationType, TurnValidationType } from "../utils/constants";

export const handActions = (game: Game) => ({
    [HandStageValidationType.EndGame]: () => game.handStageValidator.endGame(game),
    [HandStageValidationType.StartHandStage]: () => {
        game.handStageValidator.startHandStage(game);
        const bettingValidation = game.bettingStageValidator.validate(game);
        bettingActions(game)[bettingValidation]?.();
    },
    default: () => console.error("Unhandled HandStageValidationType"),
});

export const bettingActions = (game: Game) => ({
    [BettingStageValidationType.EndHandStage]: () => game.bettingStageValidator.endHand(game),
    [BettingStageValidationType.StartBettingStage]: () => {
        game.bettingStageValidator.startBettingStage(game);
        const turnValidation = game.turnValidator.validate(game);
        turnActions(game)[turnValidation]?.();
    },
});

export const turnActions = (game: Game) => ({
    [TurnValidationType.EndBettingStage]: () => game.turnValidator.endBettingStage(game),
    [TurnValidationType.GiveActions]: () => game.turnValidator.giveActions(game),
    [TurnValidationType.NextPlayer]: () => game.turnValidator.nextPlayer(game),
});

export const executeValidators = (game: Game) => {
    const handValidation = game.handStageValidator.validate(game);
    handActions(game)[handValidation]?.();
};