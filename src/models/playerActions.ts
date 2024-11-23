import { Player, Pot } from './chipHolders'
import { Game } from './gameStages';
import { ActionType, BettingStageType } from '../utils/constants';

export class ActionSelector {
    getOptions(game: Game): ActionType[] {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const handStage = game.handStage;
        const bettingStage = game.bettingStage;

        const bigBlindValue = handStage.bigBlindValue;
        const actualBetValue = bettingStage.actualBetValue;
        const minimumRaise = bettingStage.minimumRaise;

        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const isPreFlop = bettingStage.stage === BettingStageType.PreFlop;
        const isSmallBlind = positionManager.turnIndex == positionManager.smallBlindIndex;
        const isBigBlind = positionManager.turnIndex == positionManager.bigBlindIndex;
        const isBetting = currentPlayer.pendingChips > 0;
        const isBettingBigBlind = currentPlayer.pendingChips === bigBlindValue;
        const mustEqualBet = currentPlayer.pendingChips < actualBetValue;
        const mustAllIn = currentPlayer.getTotalChips() < actualBetValue;
        const canRaise = currentPlayer.getTotalChips() > minimumRaise;

        if (isPreFlop) {
            if (isSmallBlind && !isBetting) {
                return [ActionType.PutSmallBlind];
            } else if (isBigBlind) {
                if (!isBetting) {
                    return [ActionType.PutBigBlind];
                } else if (isBettingBigBlind && !mustEqualBet) {
                    return [ActionType.CheckBigBlind, ActionType.Raise];
                }
            }
        }
        
        if (mustAllIn) {
            return [ActionType.MustAllIn, ActionType.Fold];
        }
        
        if (mustEqualBet) {
            if (canRaise) {
                return [ActionType.Call, ActionType.Raise, ActionType.Fold];
            } else {
                return [ActionType.Call, ActionType.RaiseAllIn, ActionType.Fold];
            }
        }
        
        return [ActionType.Check, ActionType.Bet];
    }
}

export class PlayerActions {
    putSmallBlind(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const handStage = game.handStage;
        const currentPlayer: Player = playerList[positionManager.turnIndex];

        currentPlayer.prepareChips(handStage.smallBlindValue);
        positionManager.updateNextTurn(game);
    }
    
    putBigBlind(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const bettingStage = game.bettingStage;
        const handStage = game.handStage;
        const bigBlindValue = handStage.bigBlindValue;

        bettingStage.actualBetValue = bigBlindValue;
        bettingStage.minimumRaise = bigBlindValue * 2;
        currentPlayer.prepareChips(bigBlindValue);
        positionManager.updateNextTurn(game);
    }
    
    checkBigBlind(game: Game): void {
        const positionManager = game.positionManager;
        const bettingStage = game.bettingStage;

        bettingStage.setBigBlindCheck();
        positionManager.updateNextTurn(game);
    }
    
    check(game: Game): void {
        const positionManager = game.positionManager;
        const bettingStage = game.bettingStage;

        bettingStage.checkCount += 1;
        positionManager.updateNextTurn(game);
    }
    
    bet(game: Game, amount: number): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const handStage = game.handStage;
        const bettingStage = game.bettingStage;
        const isValidAmount: boolean = amount >= handStage.bigBlindValue;

        if (isValidAmount) {
            currentPlayer.prepareChips(amount);
            positionManager.raiserIndex = positionManager.turnIndex;
            bettingStage.actualBetValue = amount;
            bettingStage.minimumRaise = amount * 2;
            bettingStage.resetCheckCount();
            positionManager.updateNextTurn(game);
        } else {
            throw new Error('Invalid amount, bet must be equal or bigger than big blind.');
        };
    }
    
    call(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const bettingStage = game.bettingStage;
        
        currentPlayer.prepareChips(bettingStage.actualBetValue - currentPlayer.pendingChips);
        positionManager.updateNextTurn(game);
    }
    
    raise(game: Game, amount: number): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const bettingStage = game.bettingStage;
        const isValidAmount: boolean = amount >= bettingStage.minimumRaise;

        if (isValidAmount) {
            const raiseValue: number = amount - bettingStage.actualBetValue;
            currentPlayer.prepareChips(amount - currentPlayer.pendingChips);
            positionManager.raiserIndex = positionManager.turnIndex;
            bettingStage.actualBetValue = amount;
            bettingStage.minimumRaise = bettingStage.actualBetValue + raiseValue;
            positionManager.updateNextTurn(game);
        } else {
            throw new Error('Invalid amount, raise must be equal or bigger than last one.');
        };
    }
    
    mustAllIn(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        
        currentPlayer.prepareChips(currentPlayer.chips);
        positionManager.updateNextTurn(game);
    }
    
    raiseAllIn(game: Game): void {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const bettingStage = game.bettingStage;
        const raiseValue = currentPlayer.getTotalChips() - bettingStage.actualBetValue;

        positionManager.raiserIndex = positionManager.turnIndex;
        bettingStage.actualBetValue = currentPlayer.getTotalChips();
        bettingStage.minimumRaise = bettingStage.actualBetValue + raiseValue;
        currentPlayer.prepareChips(currentPlayer.chips);
        positionManager.updateNextTurn(game);
    }
    
    fold(game: Game): void {
        const playerList = game.playerManager.playerList;
        const positionManager = game.positionManager;
        const currentPlayer: Player = playerList[positionManager.turnIndex];
        const potList: Pot[] = game.potManager.potList;
        
        currentPlayer.stopPlaying();
        potList.forEach(pot => pot.removeActiveById(currentPlayer.id));
        positionManager.updateNextTurn(game);
    }
}