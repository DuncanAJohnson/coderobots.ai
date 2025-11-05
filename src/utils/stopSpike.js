export const STOP_CODE = `
import motor
motor.stop()

import motor_pair
motor_pair.unpair(motor_pair.PAIR_1)
motor_pair.unpair(motor_pair.PAIR_2)
motor_pair.unpair(motor_pair.PAIR_3)
`;

