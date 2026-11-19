const CODIGO_GERENTE_GENERAL = 'SUR-GG-001';
const CODIGO_ADMIN_RRHH = 'SUR-AC-002';
const CODIGOS_ADMINISTRADORES = Object.freeze([CODIGO_GERENTE_GENERAL, CODIGO_ADMIN_RRHH]);

function esGerenteGeneral(codigoEmpleado) {
  return codigoEmpleado === CODIGO_GERENTE_GENERAL;
}

module.exports = {
  CODIGO_GERENTE_GENERAL,
  CODIGO_ADMIN_RRHH,
  CODIGOS_ADMINISTRADORES,
  esGerenteGeneral
};
