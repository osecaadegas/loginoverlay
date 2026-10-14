import type { TransitionState } from './config';

const transitions: Record<TransitionState, TransitionState[]> = {
  VISIBLE: ['FREEZING'], FREEZING: ['FROZEN'], FROZEN: ['SHATTERING'],
  SHATTERING: ['HIDDEN'], HIDDEN: ['RECONSTRUCTING'], RECONSTRUCTING: ['VISIBLE'],
};

export class TransitionMachine {
  state: TransitionState = 'VISIBLE';
  transition(next: TransitionState) {
    if (next === this.state) return true;
    if (!transitions[this.state].includes(next)) return false;
    this.state = next;
    return true;
  }
  recover(visible = true) { this.state = visible ? 'VISIBLE' : 'HIDDEN'; }
}
