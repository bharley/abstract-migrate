import { framework, DIRECTION_DOWN } from '../util/migrations';

export default function downCommand(name, options) {
  return framework(DIRECTION_DOWN, name, options);
}
