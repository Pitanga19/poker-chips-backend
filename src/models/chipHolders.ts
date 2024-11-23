import { Game } from "./gameStages";
import { loopArrayManager } from "../utils/arrayManager";

export class ChipHolder {
    protected _chips: number;
    protected _pendingChips: number;

    constructor() {
        this._chips = 0;
        this._pendingChips = 0;
    }

    toJSON() {
        return {
            chips: this._chips,
            pendingChips: this._pendingChips
        }
    }

    get chips(): number {
        return this._chips;
    }

    set chips(amount: number) {
        if (amount < 0) throw new Error('Amount cannot be negative');
        this._chips = amount;
    }

    incrementChips(amount: number): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        this._chips += amount;
    }

    decrementChips(amount: number): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        if (this._chips < amount) throw new Error('Not enough chips');
        this._chips -= amount;
    }

    get pendingChips(): number {
        return this._pendingChips;
    }

    set pendingChips(amount: number) {
        if (amount < 0) throw new Error('Amount cannot be negative');
        this._pendingChips = amount;
    }

    incrementPendingChips(amount: number): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        this._pendingChips += amount;
    }

    decrementPendingChips(amount: number): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        if (this._pendingChips < amount) throw new Error('Not enough pending chips');
        this._pendingChips -= amount;
    }

    getTotalChips(): number {
        return this._chips + this._pendingChips;
    }

    prepareChips(amount: number = this.chips): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        this.incrementPendingChips(amount);
        this.decrementChips(amount);
    }

    refundChips(amount: number = this.chips): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        this.incrementChips(amount);
        this.decrementPendingChips(amount);
    }

    transferChips(target: ChipHolder, amount: number = this.pendingChips): void {
        if (amount < 0) throw new Error('Amount cannot be negative');
        if (this._pendingChips < amount) throw new Error('Not enough pending chips to transfer');
        target.incrementChips(amount);
        this.decrementPendingChips(amount);
    }
}

export class Player extends ChipHolder {
    private _id: string;
    private _isPlaying: boolean;

    constructor(id: string, startingChips: number = 0) {
        super();
        this._id = id;
        this._isPlaying = true;
        this.chips = startingChips;
    }

    toJSON() {
        return {
            id: this._id,
            isPlaying: this._isPlaying,
            ... super.toJSON(),
        }
    }

    get id(): string {
        return this._id;
    }

    set id(id: string) {
        this._id = id;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    startPlaying(): void {
        this._isPlaying = true;
    }
    
    stopPlaying(): void {
        this._isPlaying = false;
    }
}

export class PlayerManager {
    private _playerList: Player[];

    constructor() {
        this._playerList = [];
    }

    toJSON() {
        return {
            playerList: this._playerList.map(p => p.toJSON()),
        }
    }

    get playerList(): Player[] {
        return this._playerList;
    }

    set playerList(playerList: Player[]) {
        this._playerList = playerList;
    }

    addPlayer(player: Player, position: number = this._playerList.length): void {
        this.playerList.splice(position, 0, player);
    }

    resetIsPlaying() {
        this._playerList.forEach( p => p.chips > 0 ? p.startPlaying() : p.stopPlaying() )
    }
}

export class Pot extends ChipHolder {
    private _id: number;
    private _activePlayerIds: string[];

    constructor(id: number = 0) {
        super();
        this._id = id;
        this._activePlayerIds = [];
    }

    toJSON() {
        return {
            id: this._id,
            activePlayerIds: this._activePlayerIds,
            ... super.toJSON(),
        }
    }

    get activePlayerIds() {
        return this._activePlayerIds;
    }

    set activePlayerIds(activePlayerIds: string[]) {
        this._activePlayerIds = activePlayerIds;
    }

    getPlayingIds(game: Game) {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;

        playerList.forEach(player => {
            if (player.isPlaying && player.getTotalChips() > 0) {
                this._activePlayerIds.push(player.id)
            }
        })
    }

    removeActiveById(idToRemove: string): void {
        const index = this._activePlayerIds.findIndex(id => id === idToRemove);
        
        if (index !== -1) {
            this._activePlayerIds.splice(index, 1);
        } else {
            throw new Error(`Id not found: ${idToRemove}`);
        }
    }

    areEnoughPlayingValidation(): boolean {
        const arePlayingCount: number = this._activePlayerIds.length;
        const areEnoughPlaying: boolean = arePlayingCount > 1;

        return areEnoughPlaying;
    }

    getMinimumPendingChips(game: Game): number {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        
        const activePlayerList: Player[] = playerList.filter(p => this._activePlayerIds.includes(p.id));
        const minimumPendingChips: number = Math.min(... activePlayerList.map(p => p.pendingChips));

        return minimumPendingChips;
    }

    getMaximumPosibleBetValue(game: Game): number {
        const playerManager = game.playerManager;
        const playerList = playerManager.playerList;
        
        const activePlayerList: Player[] = playerList.filter(p => this._activePlayerIds.includes(p.id));
        const maximumPosibleBetValue: number = Math.min(... activePlayerList.map(p => p.getTotalChips()));

        return maximumPosibleBetValue;
    }

    defineWinners(game: Game): void {
        const playerList = game.playerManager.playerList;
        const positionManager = game.positionManager;

        const winnerIndexList: number[] = []
        this._activePlayerIds.forEach(id => winnerIndexList.push(playerList.findIndex(player => player.id == id)));;

        positionManager.winnerIndexList = winnerIndexList;
    }
    
    payWinners(game: Game): void {
        const positionManager = game.positionManager;
        const playerList = game.playerManager.playerList;
        const winnerIndexList = positionManager.winnerIndexList;
        const winnerCount: number = winnerIndexList.length;
        const winnerReward: number = Math.floor(this._chips / winnerCount);
        
        winnerIndexList.forEach(index => {
            this.prepareChips(winnerReward);
            this.transferChips(playerList[index]);
        });

        if (this._chips > 0){
            const randomIndex = loopArrayManager.getRandomIndex(positionManager.winnerIndexList);
            this.prepareChips(this._chips);
            this.transferChips(playerList[randomIndex])
        }
    }
}

export class PotManager {
    private _potList: Pot[];

    constructor() {
        this._potList = [new Pot()];
    }

    toJSON() {
        return {
            potList: this._potList,
        }
    }

    get potList(): Pot[] {
        return this._potList;
    }

    set potList(potList: Pot[]) {
        this._potList = potList;
    }

    resetPotList(): void {
        this._potList = [new Pot()];
    }

    playingPot(): Pot {
        const potListCount = this._potList.length;
        const playingPotIndex = potListCount - 1;

        return this._potList[playingPotIndex];
    }

    needSidePotValidation(game: Game): boolean {
        const playerList = game.playerManager.playerList;
        const activePlayersIds = this.playingPot().activePlayerIds;
        const activePlayerList: Player[] = playerList.filter(p => activePlayersIds.includes(p.id));

        const activePlayerCount = activePlayerList.length;
        if (activePlayerCount === 0) return false;

        const firstPendingChipsValue: number = activePlayerList[0].pendingChips;
        const areDifferentPendingChips: boolean = activePlayerList.some(player => player.pendingChips !== firstPendingChipsValue);

        if (activePlayerCount === 2) {
            const finalBet = this.playingPot().getMinimumPendingChips(game);
            activePlayerList.forEach(p => p.refundChips(p.pendingChips - finalBet));
            return false;
        }
        return areDifferentPendingChips;
    }

    collectToPlayingPot(game: Game, amount: number = -1): void {
        const playerList = game.playerManager.playerList;
        
        playerList.forEach(player => {
            if (player.pendingChips > 0) {
                amount === -1 ?
                player.transferChips(this.playingPot()) :
                player.transferChips(this.playingPot(), amount);
            }
        })
    }
    
    createSidePot(game: Game): void {
        const newPotId = this._potList.length;
        const collectAmount: number = this.playingPot().getMaximumPosibleBetValue(game);

        this.collectToPlayingPot(game, collectAmount);
        this._potList.push(new Pot(newPotId));
        this.playingPot().getPlayingIds(game);
    }
}