import { framework, DIRECTION_UP } from '../util/migrations';

export default function downCommand(name, options) {
  return framework(DIRECTION_UP, name, options);
}
