// Canonical session metrics shared by the hunt widget and command masthead.
export function calculateBonusHuntStats(bonuses=[],startMoney=0,stopLoss=0){
    const totalBetAll = bonuses.reduce(
      (s, b) => s + (Number(b.betSize) || 0),
      0,
    );
    const openedBonuses = bonuses.filter((b) => b.opened);
    const totalBetOpened = openedBonuses.reduce(
      (s, b) => s + (Number(b.betSize) || 0),
      0,
    );
    const totalWin = openedBonuses.reduce(
      (s, b) => s + (Number(b.payout) || 0),
      0,
    );
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);
    const superCount = bonuses.filter((b) => b.isSuperBonus).length;

    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;

    /* Best & worst opened slot by multiplier */
    let bestSlot = null,
      worstSlot = null;
    openedBonuses.forEach((b) => {
      const bet = Number(b.betSize) || 0;
      const pay = Number(b.payout) || 0;
      const multi = bet > 0 ? pay / bet : 0;
      if (!bestSlot || multi > bestSlot._multi)
        bestSlot = { ...b, _multi: multi, _payout: pay };
      if (!worstSlot || multi < worstSlot._multi)
        worstSlot = { ...b, _multi: multi, _payout: pay };
    });

    return {
      totalBetAll,
      totalWin,
      superCount,
      breakEven,
      liveBE,
      avgMulti,
      openedCount: openedBonuses.length,
      bestSlot,
      worstSlot,
    };
}
