export const PORT = Number(process.env.PORT) || 3000;
export const IP = '0.0.0.0';

export enum ActionType {
    PutSmallBlind = 'putSmallBlind',
    PutBigBlind = 'putBigBlind',
    CheckSmallBlind = 'checkSmallBlind',
    CheckBigBlind = 'checkBigBlind',
    Check = 'check',
    Bet = 'bet',
    Call = 'call',
    Raise = 'raise',
    MustAllIn = 'allIn',
    RaiseAllIn = 'raiseAllIn',
    Fold = 'fold'
}

export enum BettingStageType {
    PreFlop = 'preFlop',
    Flop = 'flop',
    Turn = 'turn',
    River = 'river'
}

export const BettingStageTypeList: BettingStageType[] = [
    BettingStageType.PreFlop,
    BettingStageType.Flop,
    BettingStageType.Turn,
    BettingStageType.River
];

export enum toExecuteValidatorType {
    HandStageValidator = 'handStageValidator',
    BettingStageValidator = 'bettingStageValidator',
    TurnValidator = 'turnValidator',
    ActionSelector = 'actionSelector',
    WinnerSelector = 'winnerSelector',
    GameOver = 'gameOver'
}

export enum HandStageValidationType {
    StartHandStage = 'startHandStage',
    EndGame = 'endGame'
}

export enum BettingStageValidationType {
    StartBettingStage = 'startBettingStage',
    EndHandStage = 'endHand'
}

export enum TurnValidationType {
    GiveActions = 'giveActions',
    NextPlayer = 'nextPlayer',
    EndBettingStage = 'finishRound'
}
