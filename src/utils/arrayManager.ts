class ArrayManager {
    private _isLoop: boolean;

    constructor(isLoop: boolean){
        this._isLoop = isLoop;
    }
    
    get isLoop(): boolean {
        return this._isLoop;
    }
    
    set isLoop(boolean: boolean){
        this._isLoop = boolean;
    }

    getNextIndex(array: any[], index: number): number {
        return index < array.length -1 ? index + 1 : this._isLoop ? 0 : index;
    }

    getPreviousIndex(array: any[], index: number): number {
        return index > 0 ? index - 1 : this._isLoop ? array.length - 1 : 0;
    }

    getRandomIndex(array: any[]): number {
        return Math.floor(Math.random() * array.length);
    }
}

export const loopArrayManager = new ArrayManager(true);
export const noLoopArrayManager = new ArrayManager(false);