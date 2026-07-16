export const statisticCardV2MockData = Object.freeze({
  default: {
    header: 'Session Profit',
    value: '+\u20ac1,254.50',
    secondaryLabel: 'Above target',
    progressValue: 76,
    trend: 'positive',
  },
  empty: {
    header: 'Session Profit',
    value: '\u20ac0.00',
    secondaryLabel: 'Waiting for data',
    progressValue: 0,
    trend: 'neutral',
  },
  longText: {
    header: 'Monthly Bonus Hunt Profit Performance',
    value: '+\u20ac123,456.78',
    secondaryLabel: 'Across all providers and casinos this month',
    progressValue: 94,
    trend: 'positive',
  },
  largeValue: {
    header: 'Best Win',
    value: '12,500x',
    secondaryLabel: 'Gates of Olympus 1000',
    progressValue: 100,
    trend: 'positive',
  },
});

export default statisticCardV2MockData;
