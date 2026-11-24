const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../src/routes/solicitudesRoutes');

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

test('cualquier usuario con rol ADMIN puede aprobar solicitudes', () => {
  const autorizar = middlewareRuta('put', '/:id/aprobar');

  for (const codigo_empleado of ['SUR-GG-001', 'SUR-AC-002', 'SUR-COOR-004']) {
    const res = crearRespuesta();
    let autorizado = false;
    autorizar({ usuario: { role: 'ADMIN', codigo_empleado } }, res, () => { autorizado = true; });
    assert.equal(autorizado, true, `${codigo_empleado} debería poder aprobar`);
  }
});

test('una cuenta sin rol ADMIN no puede aprobar solicitudes', () => {
  const autorizar = middlewareRuta('put', '/:id/aprobar');
  const res = crearRespuesta();
  let autorizado = false;

  autorizar({ usuario: { role: 'EMPLOYEE', codigo_empleado: 'SUR-RRHH-020' } }, res, () => {
    autorizado = true;
  });

  assert.equal(autorizado, false);
  assert.equal(res.codigo, 403);
});
