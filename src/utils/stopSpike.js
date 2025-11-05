export const STOP_CODE_SPIKE_2 = `
from spike import Motor
motor.stop()

motor_a = Motor('A')
motor_b = Motor('B')
motor_c = Motor('C')
motor_d = Motor('D')
motor_e = Motor('E')
motor_f = Motor('F')

motor_a.stop()
motor_b.stop()
motor_c.stop()
motor_d.stop()
motor_e.stop()
motor_f.stop()
`;

export const STOP_CODE_SPIKE_3 = `
import motor
motor.stop()

import motor_pair
motor_pair.unpair(motor_pair.PAIR_1)
motor_pair.unpair(motor_pair.PAIR_2)
motor_pair.unpair(motor_pair.PAIR_3)
`;