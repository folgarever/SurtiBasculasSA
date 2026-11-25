const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../src/routes/asistenciaRoutes');

function middlewareRuta(metodo, ruta) {
  const capa = router.stack.find((elemento) => elemento.route?.path === ruta
    && elemento.route.methods[metodo]);
  assert.ok(capa, `No se encontró la ruta ${metodo.toUpperCase()} ${ruta}`);
  return capa.route.stack[0].handle;
}

function crearRespuesta() {
  return {
    codigo: 200,
    cuerpo: null,
    status(codigo) {
      this.codigo = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

test('las marcaciones admiten empleados y cualquier cuenta ADMIN', () => {
  const autorizar = middlewareRuta('post', '/marcar');
  const usuarios = [
    { role: 'EMPLOYEE', codigo_empleado: 'SUR-VEN-003' },
    { role: 'ADMIN', codigo_empleado: 'SUR-AC-002' },
    { role: 'ADMIN', codigo_empleado: 'SUR-COOR-004' },
  ];

  for (const usuario of usuarios) {
    let autorizado = false;
    autorizar({ usuario }, crearRespuesta(), () => { autorizado = true; });
    assert.equal(autorizado, true, `${usuario.codigo_empleado} debería poder marcar`);
  }
});

test('las rutas de asistencia rechazan cuentas que no sean personal', () => {
  const autorizar = middlewareRuta('post', '/marcar');
  const res = crearRespuesta();
  let autorizado = false;

  autorizar({ usuario: { role: 'CANDIDATE' } }, res, () => { autorizado = true; });

  assert.equal(autorizado, false);
  assert.equal(res.codigo, 403);
});
