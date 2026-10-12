const { getDeptFromCourse, getMandatoryCentresForStudent, isSemiconductorAllowedForStudent } = require('../src/lib/deptCentreRules');

console.log('Testing deptCentreRules exports:');
console.log('CSE ->', getDeptFromCourse('B.E. Computer Science and Engineering'), getMandatoryCentresForStudent('B.E. Computer Science and Engineering', 'A'));
console.log('AIML ->', getDeptFromCourse('B.E. Computer Science and Engineering (Artificial Intelligence and Machine Learning)'), getMandatoryCentresForStudent('B.E. Computer Science and Engineering (Artificial Intelligence and Machine Learning)', 'A'));
console.log('AIDS Sec A ->', getDeptFromCourse('B.Tech. Artificial Intelligence and Data Science'), getMandatoryCentresForStudent('B.Tech. Artificial Intelligence and Data Science', 'A'));
console.log('AIDS Sec G ->', getDeptFromCourse('B.Tech. Artificial Intelligence and Data Science'), getMandatoryCentresForStudent('B.Tech. Artificial Intelligence and Data Science', 'G'));
console.log('VLSI ->', getDeptFromCourse('B.E. Electronics Engineering (VLSI Design and Technology)'), getMandatoryCentresForStudent('B.E. Electronics Engineering (VLSI Design and Technology)', 'A'));
console.log('ECE ->', getDeptFromCourse('B.E. Electronics and Communication Engineering'), getMandatoryCentresForStudent('B.E. Electronics and Communication Engineering', 'A'));

console.log('Semiconductor allowed for VLSI?', isSemiconductorAllowedForStudent('B.E. Electronics Engineering (VLSI Design and Technology)'));
console.log('Semiconductor allowed for ECE?', isSemiconductorAllowedForStudent('B.E. Electronics and Communication Engineering'));
console.log('Semiconductor allowed for CSE?', isSemiconductorAllowedForStudent('B.E. Computer Science and Engineering'));
