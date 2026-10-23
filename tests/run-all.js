/**
 * @fileoverview Orquestador y ejecutor de todas las pruebas unitarias del simulador.
 */

import { runVectorTests } from './vector.test.js';
import { runNewtonTests } from './newton.test.js';
import { runEnergiaTests } from './energia.test.js';
import { runRotacionTests } from './rotacion.test.js';
import { runGravitacionTests } from './gravitacion.test.js';
import { runOscilacionesTests } from './oscilaciones.test.js';
import { runUiTests } from './ui.test.js';

const SUITES = [
  runVectorTests,       // Suite 1: Cinemática 2D
  runNewtonTests,       // Suite 2: Leyes de Newton y Fuerzas
  runEnergiaTests,      // Suite 3: Conservación de la Energía
  runRotacionTests,     // Suite 4: Dinámica rotacional
  runGravitacionTests,  // Suite 5: Gravitación y Kepler
  runOscilacionesTests, // Suite 6: Oscilaciones mecánicas
  runUiTests,           // Suite 7: Interfaz (HTML, CSS y controladores coherentes)
];

try {
  console.log("====================================================");
  console.log("LABORATORIO DE FÍSICA — EJECUTOR DE PRUEBAS LOCALES");
  console.log("====================================================");

  SUITES.forEach((runSuite, i) => {
    runSuite();
    if (i < SUITES.length - 1) console.log("\n----------------------------------------------------");
  });

  console.log("====================================================");
  console.log("ESTADO DEL PROYECTO: SANO Y LISTO PARA DEPLOY");
  console.log("====================================================");
  process.exit(0);
} catch (error) {
  console.error("\n❌ ERROR CRÍTICO DURANTE LA EJECUCIÓN DE PRUEBAS:");
  console.error(error);
  console.log("====================================================");
  process.exit(1);
}
