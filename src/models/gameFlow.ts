import { Game } from "./gameStages";
import { Pot } from "./chipHolders";
import { toExecuteValidatorType, HandStageValidationType, BettingStageValidationType, TurnValidationType } from "../utils/constants";
import { loopArrayManager } from '../utils/arrayManager';

export class PositionManager {
    private _dealerIndex: number;
    private _smallBlindIndex: number;
    private _bigBlindIndex: number;
    private _turnIndex: number;
    private _raiserIndex: number;
    private _winnerIndexList: number[];

    constructor () {
        this._dealerIndex = -1;
        this._smallBlindIndex = -1;
        this._bigBlindIndex = -1;
        this._turnIndex = -1;
        this._raiserIndex = -1;
        this._winnerIndexList = [];
    }

    toJSON() {
        return {
            dealerIndex: this._dealerIndex,
            smallBlindIndex: this._smallBlindIndex,
            bigBlindIndex: this._bigBlindIndex,
            turnIndex: this._turnIndex,
            raiserIndex: this._raiserIndex,
            winnerIndexList: this._winnerIndexList
        }
    }

    get dealerIndex(): number {
        return this._dealerIndex;
    }

    set dealerIndex(index: number) {
        this._dealerIndex = index;
    }

    get smallBlindIndex(): number {
        return this._smallBlindIndex;
    }

    set smallBlindIndex(index: number) {
        this._smallBlindIndex = index;
    }

    get bigBlindIndex(): number {
        return this._bigBlindIndex;
    }

    set bigBlindIndex(index: number) {
        this._bigBlindIndex = index;
    }

    get turnIndex(): number {
        return this._turnIndex;
    }

    set turnIndex(index: number) {
        this._turnIndex = index;
    }

    get raiserIndex(): number {
        return this._raiserIndex;
    }

    set raiserIndex(index: number) {
        this._raiserIndex = index;
    }

    get winnerIndexList(): number[] {
        return this._winnerIndexList;
    }

    set winnerIndexList(indexList: number[]) {
        this._winnerIndexList = indexList;
    }

    checkIsPlaying(game: Game, index: number): boolean {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        return playerList[index].isPlaying && playerList[index].chips > 0;
    }

    findFirstPlayingIndex(game: Game, index: number): number {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        let firstPlayingIndex = index;
        let checkedPlayingCount = 0;

        while (!this.checkIsPlaying(game, firstPlayingIndex) && checkedPlayingCount < playerList.length) {
            firstPlayingIndex = loopArrayManager.getNextIndex(playerList, firstPlayingIndex);
            checkedPlayingCount++;
        }
        
        return firstPlayingIndex;
    }

    initializePositions(game: Game, dealerIndex: number): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        dealerIndex = dealerIndex === -1 ? loopArrayManager.getRandomIndex(playerList) : dealerIndex;
        this._dealerIndex =  this.findFirstPlayingIndex(game, dealerIndex);
        this._smallBlindIndex = this.findFirstPlayingIndex(game,
            loopArrayManager.getNextIndex(playerList, this._dealerIndex));
        this._bigBlindIndex = this.findFirstPlayingIndex(game,
            loopArrayManager.getNextIndex(playerList, this._smallBlindIndex));
        this._turnIndex = this._smallBlindIndex;
        this._raiserIndex = -1;
        this._winnerIndexList = [];
    }

    updateNextTurn(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        this._turnIndex = loopArrayManager.getNextIndex(playerList, this._turnIndex);
    }

    updateNextStage(): void {
        this._turnIndex = this._smallBlindIndex;
        this._raiserIndex = -1;
    }

    updateNextHand(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        const nextDealer = loopArrayManager.getNextIndex(playerList, this._dealerIndex);
        this.initializePositions(game, nextDealer);
    }
}

export class HandStageValidator {
    validate(game: Game): HandStageValidationType {
        const playerManager = game.playerManager;

        const playerList = playerManager.playerList;
        const arePlaying = playerList.filter( p => p.isPlaying );
        const areManyPlaying = arePlaying.length > 1;
        if (areManyPlaying) {
            return HandStageValidationType.StartHandStage;
        } else {
            return HandStageValidationType.EndGame;
        }
    }

    startHandStage(game: Game): toExecuteValidatorType {
        const handStage = game.handStage;
        const currentPot: Pot = game.potManager.playingPot();

        currentPot.getPlayingIds(game);
        handStage.clearStages();
        return toExecuteValidatorType.BettingStageValidator;
    }

    endGame(game: Game): toExecuteValidatorType {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        playerList.forEach( p => p.stopPlaying() );
        return toExecuteValidatorType.GameOver;
    }
}

export class BettingStageValidator {
    validate(game: Game): BettingStageValidationType {
        const positionManager = game.positionManager;
        const winnerIndexLists = positionManager.winnerIndexList;
        const handStage = game.handStage;

        const areWinners = winnerIndexLists.length > 0;
        const riverPlayed = handStage.stagesPlayed.length === 4;

        if (areWinners || riverPlayed) {
            return BettingStageValidationType.EndHandStage;
        } else {
            return BettingStageValidationType.StartBettingStage;
        }
    }

    endHand(game: Game): toExecuteValidatorType {
        return toExecuteValidatorType.WinnerSelector;
    }

    startBettingStage(game: Game):toExecuteValidatorType {
        const bettingStage = game.bettingStage;

        bettingStage.reset(game);
        return toExecuteValidatorType.TurnValidator;
    }
}

export class TurnValidator {
    validate(game: Game): TurnValidationType {
        const currentPot: Pot = game.potManager.playingPot();
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer = playerList[positionManager.turnIndex];
        const bettingStage = game.bettingStage;

        const areEnoughPlaying = currentPot.areEnoughPlayingValidation();
        const arePlayingWithChips = playerList.filter(p => p.isPlaying && p.getTotalChips() > 0);
        const arePlayingWithChipsCount = arePlayingWithChips.length;
        const areEnoughPlayingWithChips = arePlayingWithChipsCount <= 1;
        const isPlaying = currentPlayer.isPlaying;
        const hasChipsToBet = currentPlayer.chips > 0;
        const isRaiser = positionManager.turnIndex === positionManager.raiserIndex;
        const doBBcheck = bettingStage.doBigBlindCheck;
        const doEveryoneCheck = bettingStage.checkCount === arePlayingWithChipsCount;
        const doSomeoneBet = bettingStage.actualBetValue > 0;
        const mustEqualBet = doSomeoneBet || currentPlayer.pendingChips < bettingStage.actualBetValue;

        if (!areEnoughPlaying || isRaiser || doBBcheck || doEveryoneCheck || areEnoughPlayingWithChips) {
            return TurnValidationType.EndBettingStage;
        }

        if (!isPlaying || !hasChipsToBet) {
            return TurnValidationType.NextPlayer;
        }

        if (isPlaying && hasChipsToBet && ( !doSomeoneBet || mustEqualBet)) {
            return TurnValidationType.GiveActions;
        }

        throw new Error('Unexpected state in TurnValidator (throw new Error)');
    }

    endBettingStage (game: Game): toExecuteValidatorType {
        const potManager = game.potManager;
        const handStage = game.handStage;
        const bettingStage = game.bettingStage;
        const positionManager = game.positionManager;

        while (potManager.needSidePotValidation(game)) {
            potManager.createSidePot(game)
        }
        
        potManager.collectToPlayingPot(game);
        handStage.stagesPlayed.push(bettingStage.stage);
        positionManager.updateNextStage();
        return toExecuteValidatorType.BettingStageValidator;
    }

    giveActions (game: Game): toExecuteValidatorType {
        return toExecuteValidatorType.ActionSelector;
    }

    nextPlayer (game: Game): toExecuteValidatorType {
        const positionManager = game.positionManager;

        positionManager.updateNextTurn(game);
        return toExecuteValidatorType.TurnValidator;
    }
}