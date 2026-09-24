export default class ScoringSystem {
  constructor(proximitySystem, excavator, weights) {
    this.proximity = proximitySystem;
    this.excavator = excavator;
    this.weights = weights || { safety: 0.35, fuel: 0.25, idle: 0.25, task: 0.15 };

    this.safetyScore = 100;
    this.fuelScore = 100;
    this.idleScore = 100;
    this.taskScore = 0;

    this._totalTime = 0;
    this._totalIdleTime = 0;
    this._lastDigCount = 0;
  }

  reset(weights) {
    if (weights) this.weights = weights;
    this.safetyScore = 100;
    this.fuelScore = 100;
    this.idleScore = 100;
    this.taskScore = 0;
    this._totalTime = 0;
    this._totalIdleTime = 0;
    this._lastDigCount = 0;
  }

  update(deltaTime) {
    if (!this.excavator.isEngineOn) return;

    this._totalTime += deltaTime;

    if (this.proximity.getCurrentRisk() === 'HIGH') {
      this.safetyScore = Math.max(0, this.safetyScore - 5 * deltaTime);
    }

    const isIdle = this.excavator.idleTimer > 0;
    if (isIdle) {
      this._totalIdleTime += deltaTime;
    }
    if (this._totalTime > 0) {
      this.fuelScore = Math.max(0, 100 * (1 - this._totalIdleTime / this._totalTime));
    }

    if (isIdle) {
      this.idleScore = Math.max(0, this.idleScore - 2 * deltaTime);
    }

    if (this.excavator.totalDigCount > this._lastDigCount) {
      this.taskScore = Math.min(100, this.taskScore + 20);
      this._lastDigCount = this.excavator.totalDigCount;
    }
  }

  getComposite() {
    return this.safetyScore * this.weights.safety +
           this.fuelScore * this.weights.fuel +
           this.idleScore * this.weights.idle +
           this.taskScore * this.weights.task;
  }

  getSnapshot() {
    return {
      safety: this.safetyScore,
      fuel: this.fuelScore,
      idle: this.idleScore,
      task: this.taskScore,
      total: this.getComposite(),
    };
  }
}
