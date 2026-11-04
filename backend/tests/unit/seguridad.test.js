const { cifrar, descifrar } = require('../../src/shared/crypto');
const { detectarTipo } = require('../../src/shared/middleware/upload');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

describe('RNF-03 — Cifrado de identificaciones', () => {
  test('el archivo cifrado no es una imagen válida y se recupera con la clave', () => {
    const cifrado = cifrar(PNG);
    expect(detectarTipo(PNG)).toBe('image/png');
    expect(detectarTipo(cifrado)).toBeNull();
    expect(descifrar(cifrado).equals(PNG)).toBe(true);
  });
  test('con otra clave no se puede descifrar', () => {
    const cifrado = cifrar(PNG);
    expect(() => descifrar(cifrado, Buffer.alloc(32, 1))).toThrow();
  });
});

describe('CA-03.4 — Solo JPG o PNG', () => {
  test('un PDF no se acepta como imagen', () => {
    expect(detectarTipo(Buffer.from('%PDF-1.7 contenido de prueba'))).toBeNull();
  });
});
