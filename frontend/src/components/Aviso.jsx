export default function Aviso({ tipo = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`aviso ${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
