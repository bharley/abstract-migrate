import { framework, DIRECTION_ROLLBACK } from '../util/migrations';

export default function rollbackCommand(options) {
  return framework(DIRECTION_ROLLBACK, null, options);
}
