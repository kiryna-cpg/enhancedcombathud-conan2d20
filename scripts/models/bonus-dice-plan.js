export class BonusDicePlan {
  constructor({ baseDice = 2, maxDice = 5 } = {}) {
    this.baseDice = baseDice;
    this.maxDice = maxDice;

    this.fromStress = {
      vigor: 0,
      resolve: 0
    };

    this.fromMomentum = 0;
    this.fromDoom = 0;
    this.fromOther = 0;
  }

  get bonusDice() {
    return (
      this.fromStress.vigor +
      this.fromStress.resolve +
      this.fromMomentum +
      this.fromDoom +
      this.fromOther
    );
  }

  get totalDice() {
    return this.baseDice + this.bonusDice;
  }

  get remainingSlots() {
    return Math.max(0, this.maxDice - this.totalDice);
  }

  clone() {
    return foundry.utils.deepClone(this);
  }
}