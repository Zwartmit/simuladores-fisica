/**
 * @fileoverview Orquestador y ejecutor de todas las pruebas unitarias del simulador.
 */

import { runVectorTests } from './vector.test.js';
import { runNewtonTests } from './newton.test.js';

try {
  console.log("====================================================");
  console.log("LABORATORIO DE FÍSICA — EJECUTOR DE PRUEBAS LOCALES");
  console.log("====================================================");
  
  // Ejecutar Suite 1: Cinemática 2D
  runVectorTests();
  
  console.log("\n----------------------------------------------------");
  
  // Ejecutar Suite 2: Leyes de Newton y Fuerzas
  runNewtonTests();
  
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
