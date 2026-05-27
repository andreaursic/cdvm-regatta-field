import { calculateLA } from './course-la.js';
import { calculateTWA } from './course-twa.js';
import { calculateTrapezoid } from './course-trapezoid.js';

export function calculateRaceCourse(config) {

    switch (config.courseType) {

        case 'LA':
            return calculateLA(config);

        case 'TWA':
            return calculateTWA(config);

        case 'TRAPEZOID':
            return calculateTrapezoid(config);

        default:
            return calculateLA(config);
    }
}